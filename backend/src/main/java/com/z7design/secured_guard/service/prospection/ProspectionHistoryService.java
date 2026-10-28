package com.z7design.secured_guard.service.prospection;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.prospection.ProspectionCompany;
import com.z7design.secured_guard.model.prospection.ProspectionContact;
import com.z7design.secured_guard.model.prospection.ProspectionSearch;
import com.z7design.secured_guard.repository.ProspectionCompanyRepository;
import com.z7design.secured_guard.repository.ProspectionContactRepository;
import com.z7design.secured_guard.repository.ProspectionSearchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@Slf4j
@RequiredArgsConstructor
public class ProspectionHistoryService {

    private final ProspectionSearchRepository searchRepository;
    private final ProspectionCompanyRepository companyRepository;
    private final ProspectionContactRepository contactRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Salva uma pesquisa completa e todos os seus prospectos e contatos no banco de dados.
     */
    @Transactional
    public ProspectionSearch saveSearch(
            String tipoBusca,
            String termoPesquisa,
            String cidade,
            String uf,
            String segmento,
            List<Map<String, Object>> companiesData,
            User currentUser) {

        if (companiesData == null || companiesData.isEmpty()) {
            return null;
        }

        log.info("💾 Gravando histórico de pesquisa no banco: tipo={}, cidade={}/{}, total={}",
                tipoBusca, cidade, uf, companiesData.size());

        ProspectionSearch search = ProspectionSearch.builder()
                .tipoBusca(tipoBusca != null ? tipoBusca : "SEGMENTO")
                .termoPesquisa(termoPesquisa)
                .cidade(cidade)
                .uf(uf)
                .segmento(segmento)
                .totalEncontrados(companiesData.size())
                .user(currentUser)
                .build();

        search = searchRepository.save(search);

        List<ProspectionCompany> companyEntities = new ArrayList<>();

        for (Map<String, Object> data : companiesData) {
            String razao = (String) data.getOrDefault("razaoSocial", data.getOrDefault("nomeFantasia", "Empresa"));
            if (razao == null || razao.isBlank()) {
                razao = "Empresa sem nome";
            }

            String detailsJson = null;
            try {
                detailsJson = objectMapper.writeValueAsString(data);
            } catch (Exception ignored) {}

            ProspectionCompany comp = ProspectionCompany.builder()
                    .search(search)
                    .cnpj((String) data.get("cnpj"))
                    .razaoSocial(razao)
                    .nomeFantasia((String) data.get("nomeFantasia"))
                    .municipio((String) data.getOrDefault("municipio", cidade))
                    .uf((String) data.getOrDefault("uf", uf))
                    .email((String) data.get("email"))
                    .emailCompras((String) data.get("emailCompras"))
                    .telefone((String) data.get("telefone"))
                    .website((String) data.get("website"))
                    .origem((String) data.getOrDefault("origem", tipoBusca))
                    .detalhesJson(detailsJson)
                    .build();

            comp = companyRepository.save(comp);

            // Processar e salvar contatos (Sócios, Decisores, Compras)
            saveContactsForCompany(comp, data);

            companyEntities.add(comp);
        }

        search.setCompanies(companyEntities);
        return search;
    }

    private void saveContactsForCompany(ProspectionCompany comp, Map<String, Object> data) {
        List<ProspectionContact> contactsToSave = new ArrayList<>();

        // 1. Sócios do QSA
        Object qsaObj = data.get("qsa");
        if (qsaObj instanceof List<?> qsaList) {
            for (Object item : qsaList) {
                if (item instanceof Map<?, ?> socioMap) {
                    String nome = (String) socioMap.get("nome");
                    if (nome != null && !nome.isBlank()) {
                        String qual = (String) socioMap.getOrDefault("qualificacao", "Sócio / Administrador");
                        String email = (String) socioMap.get("email");
                        String tel = (String) socioMap.get("telefone");
                        String linkedin = (String) socioMap.get("linkedinUrl");

                        contactsToSave.add(ProspectionContact.builder()
                                .company(comp)
                                .nome(nome)
                                .cargoTipo("SOCIO")
                                .cargoDescricao(qual)
                                .email(email)
                                .telefone(tel)
                                .linkedinUrl(linkedin)
                                .build());
                    }
                }
            }
        }

        // 2. Decisores (Diretores, CEOs, Gerentes de Facilities / Operações)
        Object decisoresObj = data.get("decisores");
        if (decisoresObj instanceof List<?> decList) {
            for (Object item : decList) {
                if (item instanceof Map<?, ?> decMap) {
                    String nome = (String) decMap.get("nome");
                    if (nome != null && !nome.isBlank()) {
                        contactsToSave.add(ProspectionContact.builder()
                                .company(comp)
                                .nome(nome)
                                .cargoTipo("DECISOR")
                                .cargoDescricao((String) decMap.getOrDefault("cargo", "Tomador de Decisão"))
                                .email((String) decMap.get("email"))
                                .telefone((String) decMap.get("telefone"))
                                .linkedinUrl((String) decMap.get("linkedinUrl"))
                                .build());
                    }
                }
            }
        }

        // 3. Setor de Compras / Suprimentos
        String emailCompras = (String) data.get("emailCompras");
        String comprasNome = (String) data.getOrDefault("contatoComprasNome", "Setor de Compras / Suprimentos");
        if (emailCompras != null && !emailCompras.isBlank()) {
            contactsToSave.add(ProspectionContact.builder()
                    .company(comp)
                    .nome(comprasNome)
                    .cargoTipo("COMPRAS")
                    .cargoDescricao("Compras / Procurement / Cotações")
                    .email(emailCompras)
                    .telefone((String) data.get("telefoneCompras"))
                    .build());
        }

        if (!contactsToSave.isEmpty()) {
            contactRepository.saveAll(contactsToSave);
        }
    }

    /**
     * Lista as pesquisas recentes paginadas.
     */
    @Transactional(readOnly = true)
    public Page<ProspectionSearch> listRecentSearches(int page, int size) {
        return searchRepository.findAllByOrderByCreatedAtDesc(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
    }

    /**
     * Recupera os detalhes completos de uma pesquisa gravada, formatando os prospectos com contatos.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getSearchDetails(UUID searchId) {
        ProspectionSearch search = searchRepository.findById(searchId)
                .orElseThrow(() -> new IllegalArgumentException("Pesquisa não encontrada: " + searchId));

        List<ProspectionCompany> companies = companyRepository.findBySearchId(searchId);
        List<Map<String, Object>> mappedCompanies = new ArrayList<>();

        for (ProspectionCompany comp : companies) {
            Map<String, Object> map = new HashMap<>();
            if (comp.getDetalhesJson() != null && !comp.getDetalhesJson().isBlank()) {
                try {
                    map = objectMapper.readValue(comp.getDetalhesJson(), new TypeReference<Map<String, Object>>() {});
                } catch (Exception e) {
                    log.warn("Erro ao desserializar detalhes da empresa {}: {}", comp.getId(), e.getMessage());
                }
            }

            map.put("id", comp.getId().toString());
            map.put("cnpj", comp.getCnpj());
            map.put("razaoSocial", comp.getRazaoSocial());
            map.put("nomeFantasia", comp.getNomeFantasia());
            map.put("municipio", comp.getMunicipio());
            map.put("uf", comp.getUf());
            map.put("email", comp.getEmail());
            map.put("emailCompras", comp.getEmailCompras());
            map.put("telefone", comp.getTelefone());
            map.put("website", comp.getWebsite());
            map.put("origem", comp.getOrigem());
            map.put("leadId", comp.getLead() != null ? comp.getLead().getId().toString() : null);

            // Carregar contatos gravados
            List<ProspectionContact> contacts = contactRepository.findByCompanyId(comp.getId());
            List<Map<String, Object>> qsaList = new ArrayList<>();
            List<Map<String, Object>> decisoresList = new ArrayList<>();

            for (ProspectionContact contact : contacts) {
                Map<String, Object> cMap = new HashMap<>();
                cMap.put("nome", contact.getNome());
                cMap.put("cargo", contact.getCargoDescricao());
                cMap.put("qualificacao", contact.getCargoDescricao());
                cMap.put("email", contact.getEmail());
                cMap.put("telefone", contact.getTelefone());
                cMap.put("linkedinUrl", contact.getLinkedinUrl());

                if ("SOCIO".equalsIgnoreCase(contact.getCargoTipo())) {
                    qsaList.add(cMap);
                } else if ("DECISOR".equalsIgnoreCase(contact.getCargoTipo())) {
                    decisoresList.add(cMap);
                } else if ("COMPRAS".equalsIgnoreCase(contact.getCargoTipo())) {
                    map.put("emailCompras", contact.getEmail());
                    map.put("contatoComprasNome", contact.getNome());
                }
            }

            if (!qsaList.isEmpty()) map.put("qsa", qsaList);
            if (!decisoresList.isEmpty()) map.put("decisores", decisoresList);

            mappedCompanies.add(map);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("id", search.getId().toString());
        response.put("tipoBusca", search.getTipoBusca());
        response.put("termoPesquisa", search.getTermoPesquisa());
        response.put("cidade", search.getCidade());
        response.put("uf", search.getUf());
        response.put("segmento", search.getSegmento());
        response.put("totalEncontrados", search.getTotalEncontrados());
        response.put("createdAt", search.getCreatedAt());
        response.put("prospects", mappedCompanies);

        return response;
    }
}
