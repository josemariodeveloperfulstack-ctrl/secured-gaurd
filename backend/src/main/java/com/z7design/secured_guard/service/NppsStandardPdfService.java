package com.z7design.secured_guard.service;

import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.util.EmployeeDocumentDateResolver;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Serviço para geração do documento
 * "NPPS – Norma e Procedimento do Posto de Serviço"
 * utilizando o novo layout padrão do sistema.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NppsStandardPdfService {

    private final StandardReportLayoutService standardReportLayoutService;
    private final CompanyRepository companyRepository;
    private final EmployeeDocumentDateResolver documentDateResolver;

    private static final String REPORT_TITLE = "NPPS – Norma e Procedimento do Posto de Serviço";

    public byte[] generatePdf(UUID companyId, UUID employeeId, String employeeName, String employeeCpf) {

        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(outputStream);

            UUID resolvedCompanyId = resolveCompanyId(companyId);
            LocalDate documentDate = documentDateResolver.resolveDocumentDateOrToday(employeeId, null);

            var configBuilder = ReportLayoutConfig.builder()
                    .companyId(resolvedCompanyId)
                    .reportTitle(REPORT_TITLE)
                    .includeEmailInFooter(true);
            documentDateResolver.applyAdmissionDateFooter(configBuilder, employeeId);
            ReportLayoutConfig config = configBuilder.build();

            StandardReportLayoutService.DocumentWithPdf docWithPdf =
                    standardReportLayoutService.createDocumentWithLayout(writer, config);

            Document document = docWithPdf.getDocument();
            Company company = docWithPdf.getCompany();

            addContent(document, company, employeeName, employeeCpf, documentDate);


            document.close();
            return outputStream.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF do NPPS", e);
            throw new RuntimeException("Erro ao gerar PDF do NPPS", e);
        }
    }

    private UUID resolveCompanyId(UUID requestedCompanyId) {
        if (requestedCompanyId != null) {
            return requestedCompanyId;
        }

        List<Company> active = companyRepository.findByStatus(Company.CompanyStatus.ACTIVE);
        if (!active.isEmpty()) {
            return active.get(0).getId();
        }

        List<Company> all = companyRepository.findAll();
        if (!all.isEmpty()) {
            return all.get(0).getId();
        }

        throw new RuntimeException("Não foi possível determinar a empresa para o relatório NPPS.");
    }

    private void addContent(Document document, Company company, String employeeName, String employeeCpf,
            LocalDate documentDate) {

        // Prefácio
        document.add(createSectionHeader("Prefácio"));
        document.add(createParagraph(
                "O objetivo deste Manual é a busca constante da melhoria no aspecto de segurança para o posto " +
                "e a preservação do patrimônio do cliente, através de Normas e Procedimentos do Posto de Serviço, " +
                "que deverão ser seguidas por todos os profissionais na área de segurança e também serão de " +
                "conhecimento dos responsáveis pelo posto de serviço."));

        // Características pessoais
        document.add(createSectionHeader("Características Pessoais"));
        document.add(createParagraph(
                "A comunicação direta com o público envolve comportamentos que facilitam a troca efetiva de " +
                "informações entre emissor e receptor. Entre eles destacam-se:"));

        document.add(createBulletList(new String[]{
                "Vocabulário simples e objetivo, que facilite a compreensão.",
                "Voz firme e clara, mantendo a atenção do ouvinte.",
                "Sorriso e olhar cordial, transmitindo empatia e respeito.",
                "Gestos que reforcem a mensagem sem exageros.",
                "Clareza e precisão ao expor fatos e orientações.",
                "Memória para reter fatos relevantes ao atendimento.",
                "Adaptação a diferentes situações e perfis de pessoas.",
                "Rapidez e aproveitamento do tempo, sem perder a qualidade.",
                "Bom senso na tomada de decisões.",
                "Aptidão verbal para se comunicar de forma educada e profissional."
        }));

        // Requisitos pessoais
        document.add(createSectionHeader("Requisitos Pessoais para Lidar com o Público"));
        document.add(createParagraph(
                "Facilidade de comunicação, equilíbrio emocional, cortesia, gentileza, tolerância e respeito " +
                "às diferenças individuais são fundamentais. O vigilante deve manter aparência pessoal cuidada " +
                "e postura profissional, evitando qualquer forma de discriminação."));

        // Comunicação
        document.add(createSectionHeader("Comunicação"));
        document.add(createParagraph(
                "A comunicação é instrumento essencial do trabalho do vigilante. Para evitar ruídos e " +
                "mal-entendidos, é necessário ouvir com atenção, falar com objetividade, evitar comentários " +
                "particulares, compreender o ponto de vista do outro e lembrar sempre que o corpo também se " +
                "comunica por meio de gestos e expressões."));

        // Trabalho do Vigilante
        document.add(createSectionHeader("Trabalho do Vigilante"));
        document.add(createParagraph(
                "O vigilante é responsável por fiscalizar e proteger o patrimônio da empresa ou do cliente, " +
                "atuando principalmente de forma preventiva. Sua conduta deve ser pautada pela calma, " +
                "energia controlada, idoneidade moral, imparcialidade, linguagem adequada e capacidade de " +
                "assumir responsabilidades pelos próprios atos."));

        // Capítulo I – Normas e Procedimentos
        document.add(createSectionHeader("Capítulo I – Das Normas e Procedimentos do Posto de Serviço"));
        document.add(createParagraph(
                "Antes de assumir o serviço, o vigilante deve chegar com antecedência, cuidar da apresentação " +
                "pessoal (uniforme limpo, barba feita, cabelos e unhas em ordem), ajustar equipamentos, ler o " +
                "livro de ocorrências e se inteirar dos fatos relevantes do turno anterior."));

        document.add(createParagraph(
                "Durante o serviço, deve conferir materiais do posto, controlar entrada e saída de pessoas " +
                "conforme normas, inibir atos que comprometam a segurança, comunicar-se com responsáveis pela " +
                "unidade e com a empresa, manter o local limpo e organizado, registrar ocorrências, " +
                "movimentos de chaves, alarmes e vistorias."));

        document.add(createParagraph(
                "Ao encerrar o turno, deve realizar vistoria completa em salas, banheiros, janelas, portas e " +
                "equipamentos, comunicar irregularidades e repassar as informações relevantes ao vigilante " +
                "que assumirá o posto, conferindo também os materiais sob sua responsabilidade."));

        // Capítulo II – Deveres do Vigilante
        document.add(createSectionHeader("Capítulo II – Dos Deveres do Vigilante"));
        document.add(createBulletList(new String[]{
                "Exercer as funções com eficiência, zelo e responsabilidade.",
                "Cumprir ordens de superiores e normas disciplinares do posto.",
                "Tratar todos com educação e respeito, especialmente colegas de trabalho.",
                "Manter sigilo profissional sobre informações do posto e da empresa.",
                "Zelar pelos materiais sob sua guarda.",
                "Ser pontual e assíduo.",
                "Comunicar-se com o supervisor ou vigilante líder em qualquer situação anormal."
        }));

        Paragraph quote = new Paragraph(
                "“NO AMBIENTE DE TRABALHO OU EM QUALQUER LUGAR, NÃO SOMOS OBRIGADOS A GOSTAR DE NINGUÉM, " +
                "MAS RESPEITAR SIM.”")
                .setItalic()
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginTop(8)
                .setMarginBottom(8)
                .setFontSize(9);
        document.add(quote);

        // Capítulo III – Orientações de Segurança
        document.add(createSectionHeader("Capítulo III – Das Orientações de Segurança"));
        document.add(createParagraph(
                "A segurança é perfeita até o dia em que falha. As orientações abrangem segurança patrimonial " +
                "e prevenção de acidentes e incêndios. É indispensável manter equipamentos de combate a " +
                "incêndio em perfeitas condições, rotas de fuga desobstruídas, instalações elétricas revisadas " +
                "e áreas comuns organizadas."));

        // Capítulo IV – Recomendações
        document.add(createSectionHeader("Capítulo IV – Das Recomendações aos Vigilantes"));
        document.add(createParagraph(
                "O vigilante deve ser discreto, observador e manter sigilo sobre tudo o que vê e ouve no " +
                "trabalho, inclusive fora dele. Na dúvida, prevalece sempre a segurança: em qualquer situação, " +
                "deve consultar o coordenador ou supervisor. Atividades estranhas à vigilância somente podem " +
                "ser realizadas com autorização formal. Em situações de risco, o vigilante é o primeiro alvo, " +
                "por isso atenção constante e correta posição no posto reduzem o fator surpresa."));

        // Declaração do Colaborador
        document.add(createSectionHeader("Declaração do Colaborador(a)"));
        document.add(createParagraph(
                "Declaro que tenho conhecimento e entendimento de todas as exigências e determinações " +
                "constantes da “NPPS – Norma e Procedimento do Posto de Serviço”, bem como das penalidades " +
                "a que estarei sujeito pela não observância das mesmas. Declaro ainda que tenho em meu poder, " +
                "no posto de serviço, uma via desta NPPS, que me comprometo a cumprir e fazer cumprir."));

        document.add(createParagraph(
                "Cumpra-se e faça-se cumprir o disposto neste manual de procedimentos."));

        document.add(createParagraph(
                "PROMOVER VIGILÂNCIA PATRIMONIAL LTDA – CNPJ: 43.576.260/0001-12")
                .setTextAlignment(TextAlignment.CENTER)
                .setBold()
                .setMarginTop(10));

        // Local e data
        String city = company != null && company.getCity() != null
                ? company.getCity()
                : "________________";
        LocalDate effectiveDate = documentDate != null ? documentDate : LocalDate.now();
        String date = effectiveDate.format(
                DateTimeFormatter.ofPattern("dd 'de' MMMM 'de' yyyy", new Locale("pt", "BR")));
        String shortDate = effectiveDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy", new Locale("pt", "BR")));

        Paragraph dateLoc = new Paragraph(city + ", " + date)
                .setTextAlignment(TextAlignment.RIGHT)
                .setMarginTop(20)
                .setFontSize(9);
        document.add(dateLoc);

        // Tabela de assinaturas (até 4 colaboradores)
        Table signatures = new Table(UnitValue.createPercentArray(new float[]{50, 50}))
                .useAllAvailableWidth()
                .setMarginTop(20);

        for (int i = 0; i < 4; i++) {
            String nameVal = (i == 0 && employeeName != null && !employeeName.isEmpty()) ? employeeName : "___________________________";
            String cpfVal = (i == 0 && employeeCpf != null && !employeeCpf.isEmpty()) ? employeeCpf : "________________________";

            Paragraph p = new Paragraph()
                    .add(new Paragraph("_________________________________").setTextAlignment(TextAlignment.CENTER))
                    .add(new Paragraph("Nome: " + nameVal).setTextAlignment(TextAlignment.CENTER).setFontSize(8))
                    .add(new Paragraph("CPF n.º: " + cpfVal).setTextAlignment(TextAlignment.CENTER).setFontSize(8))
                    .add(new Paragraph("Data: " + (i == 0 ? shortDate : "____/____/______"))
                            .setTextAlignment(TextAlignment.CENTER).setFontSize(8));
            signatures.addCell(p.setMarginTop(5).setMarginBottom(10));
        }


        document.add(signatures);
    }

    private Paragraph createSectionHeader(String title) {
        return new Paragraph(title)
                .setBold()
                .setFontSize(11)
                .setMarginTop(12)
                .setMarginBottom(4);
    }

    private Paragraph createParagraph(String text) {
        return new Paragraph(text)
                .setFontSize(9)
                .setTextAlignment(TextAlignment.JUSTIFIED)
                .setMarginBottom(6);
    }

    private Paragraph createBulletList(String[] items) {
        StringBuilder sb = new StringBuilder();
        for (String item : items) {
            sb.append("• ").append(item).append("\n");
        }
        return new Paragraph(new Text(sb.toString()))
                .setFontSize(9)
                .setTextAlignment(TextAlignment.JUSTIFIED)
                .setMarginBottom(6);
    }
}

