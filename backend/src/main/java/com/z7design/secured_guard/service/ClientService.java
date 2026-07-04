package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.ClientDTO;
import com.z7design.secured_guard.exception.BusinessException;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Client;
import com.z7design.secured_guard.model.enums.ClientStatus;
import com.z7design.secured_guard.repository.ClientRepository;
import org.springframework.beans.BeanUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
@Slf4j
public class ClientService {
    
    @Autowired
    private ClientRepository clientRepository;
    
    @CacheEvict(value = "clients", allEntries = true)
    public ClientDTO createClient(ClientDTO clientDTO) {
        try {
            log.info("[DEBUG] ClientService.createClient - Iniciando criação de cliente");
            log.info("[DEBUG] Nome: {}", clientDTO.getName());
            log.info("[DEBUG] CNPJ (original): {}", clientDTO.getCnpj());
            log.info("[DEBUG] Email: {}", clientDTO.getEmail());
            
            // Normalizar CNPJ para apenas dígitos
            String normalizedCnpj = clientDTO.getCnpj() != null ? clientDTO.getCnpj().replaceAll("\\D", "") : null;
            if (normalizedCnpj == null || normalizedCnpj.isBlank()) {
                throw new BusinessException("CNPJ é obrigatório");
            }
            log.info("[DEBUG] CNPJ (normalizado): {}", normalizedCnpj);

            log.info("[DEBUG] Verificando se CNPJ já existe: {}", clientDTO.getCnpj());
            boolean cnpjExists = clientRepository.existsByCnpj(normalizedCnpj);
            log.info("[DEBUG] CNPJ existe: {}", cnpjExists);
            
            if (cnpjExists) {
                log.error("[ERROR] CNPJ já existe: {}", normalizedCnpj);
                throw new BusinessException("Já existe um cliente cadastrado com este CNPJ: " + normalizedCnpj);
            }
            
            log.info("[DEBUG] CNPJ válido, criando cliente");
            Client client = new Client();
            BeanUtils.copyProperties(clientDTO, client);

            // Forçar salvar CNPJ normalizado
            client.setCnpj(normalizedCnpj);
            
            // Limpar campos vazios para evitar problemas de validação
            if (client.getEmail() != null && client.getEmail().trim().isEmpty()) {
                client.setEmail(null);
            }
            if (client.getContactEmail() != null && client.getContactEmail().trim().isEmpty()) {
                client.setContactEmail(null);
            }
            
            // Validar formato de email se fornecido
            if (client.getEmail() != null && !client.getEmail().matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
                log.error("[ERROR] Email inválido: {}", client.getEmail());
                throw new BusinessException("Formato de email inválido: " + client.getEmail());
            }
            if (client.getContactEmail() != null && !client.getContactEmail().matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
                log.error("[ERROR] Email de contato inválido: {}", client.getContactEmail());
                throw new BusinessException("Formato de email de contato inválido: " + client.getContactEmail());
            }
            
            // Definir status padrão se não fornecido
            if (client.getStatus() == null) {
                client.setStatus(ClientStatus.ACTIVE);
                log.info("[DEBUG] Status definido como ACTIVE");
            }
            
            log.info("[DEBUG] Salvando cliente no banco");
            Client savedClient = clientRepository.save(client);
            log.info("[DEBUG] Cliente salvo com ID: {}", savedClient.getId());
            
            ClientDTO savedClientDTO = new ClientDTO();
            BeanUtils.copyProperties(savedClient, savedClientDTO);
            
            log.info("[DEBUG] Cliente criado com sucesso: {}", savedClientDTO.getId());
            return savedClientDTO;
        } catch (Exception e) {
            log.error("[ERROR] Erro ao criar cliente: {}", e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }
    
    @CacheEvict(value = "clients", allEntries = true)
    public ClientDTO updateClient(UUID id, ClientDTO clientDTO) {
        Client existingClient = clientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente não encontrado com ID: " + id));
        
        // Verificar se o CNPJ foi alterado e se já existe outro cliente com o novo CNPJ
        if (!existingClient.getCnpj().equals(clientDTO.getCnpj()) && 
            clientRepository.existsByCnpj(clientDTO.getCnpj())) {
            throw new BusinessException("Já existe um cliente cadastrado com este CNPJ: " + clientDTO.getCnpj());
        }
        
        BeanUtils.copyProperties(clientDTO, existingClient, "id", "createdAt");
        
        Client updatedClient = clientRepository.save(existingClient);
        
        ClientDTO updatedClientDTO = new ClientDTO();
        BeanUtils.copyProperties(updatedClient, updatedClientDTO);
        
        return updatedClientDTO;
    }
    
    @Cacheable(value = "clients", key = "#id")
    public ClientDTO getClientById(UUID id) {
        Client client = clientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente não encontrado com ID: " + id));
        
        ClientDTO clientDTO = new ClientDTO();
        BeanUtils.copyProperties(client, clientDTO);
        
        return clientDTO;
    }
    
    @Cacheable(value = "clients", key = "#cnpj")
    public ClientDTO getClientByCnpj(String cnpj) {
        Client client = clientRepository.findByCnpj(cnpj)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente não encontrado com CNPJ: " + cnpj));
        
        ClientDTO clientDTO = new ClientDTO();
        BeanUtils.copyProperties(client, clientDTO);
        
        return clientDTO;
    }
    
    @Cacheable(value = "clients", key = "'paged-' + #pageable.toString()")
    public Page<ClientDTO> getAllClients(Pageable pageable) {
        Page<Client> clients = clientRepository.findAll(pageable);
        return clients.map(client -> {
            ClientDTO clientDTO = new ClientDTO();
            BeanUtils.copyProperties(client, clientDTO);
            return clientDTO;
        });
    }
    
    @Cacheable(value = "clients", key = "'search-' + #searchTerm + '-' + #pageable.toString()")
    public Page<ClientDTO> searchClients(String searchTerm, Pageable pageable) {
        Page<Client> clients = clientRepository.findBySearchTerm(searchTerm, pageable);
        return clients.map(client -> {
            ClientDTO clientDTO = new ClientDTO();
            BeanUtils.copyProperties(client, clientDTO);
            return clientDTO;
        });
    }
    
    @Cacheable(value = "clients", key = "'status-' + #status + '-' + #pageable.toString()")
    public Page<ClientDTO> getClientsByStatus(ClientStatus status, Pageable pageable) {
        Page<Client> clients = clientRepository.findByStatus(status, pageable);
        return clients.map(client -> {
            ClientDTO clientDTO = new ClientDTO();
            BeanUtils.copyProperties(client, clientDTO);
            return clientDTO;
        });
    }
    
    @Cacheable(value = "clients", key = "'status-search-' + #status + '-' + #searchTerm + '-' + #pageable.toString()")
    public Page<ClientDTO> getClientsByStatus(ClientStatus status, String searchTerm, Pageable pageable) {
        Page<Client> clients;
        
        if (searchTerm != null && !searchTerm.trim().isEmpty()) {
            clients = clientRepository.findByStatusAndSearchTerm(status, searchTerm, pageable);
        } else {
            clients = clientRepository.findByStatus(status, pageable);
        }
        
        return clients.map(client -> {
            ClientDTO clientDTO = new ClientDTO();
            BeanUtils.copyProperties(client, clientDTO);
            return clientDTO;
        });
    }
    
    @Cacheable(value = "clients", key = "'status-list-' + #status")
    public List<ClientDTO> getClientsByStatus(ClientStatus status) {
        List<Client> clients = clientRepository.findByStatus(status);
        return clients.stream().map(client -> {
            ClientDTO clientDTO = new ClientDTO();
            BeanUtils.copyProperties(client, clientDTO);
            return clientDTO;
        }).collect(Collectors.toList());
    }
    
    @CacheEvict(value = "clients", allEntries = true)
    public void deleteClient(UUID id) {
        Client client = clientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente não encontrado com ID: " + id));
        
        // Verificar se o cliente tem unidades ou contratos ativos
        if (!client.getUnits().isEmpty()) {
            throw new BusinessException("Não é possível excluir o cliente pois existem unidades vinculadas");
        }
        
        if (!client.getContracts().isEmpty()) {
            throw new BusinessException("Não é possível excluir o cliente pois existem contratos vinculados");
        }
        
        clientRepository.delete(client);
    }
    
    @CacheEvict(value = "clients", allEntries = true)
    public void updateClientStatus(UUID id, ClientStatus status) {
        Client client = clientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente não encontrado com ID: " + id));
        
        client.setStatus(status);
        clientRepository.save(client);
    }
    
    public long countClientsByStatus(ClientStatus status) {
        return clientRepository.countByStatus(status);
    }
    
    public boolean existsByCnpj(String cnpj) {
        return clientRepository.existsByCnpj(cnpj);
    }
} 