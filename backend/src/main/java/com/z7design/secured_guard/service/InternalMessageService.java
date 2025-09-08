/*
package com.z7design.secured_guard.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.z7design.secured_guard.model.InternalMessage;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.repository.InternalMessageRepository;
import com.z7design.secured_guard.repository.UserRepository;
import com.z7design.secured_guard.dto.InternalMessageDTO;
import com.z7design.secured_guard.dto.CreateInternalMessageRequest;
import com.z7design.secured_guard.enums.MessageType;
import com.z7design.secured_guard.enums.MessageStatus;
import com.z7design.secured_guard.enums.MessagePriority;
import com.z7design.secured_guard.service.EmailService;
import com.z7design.secured_guard.service.WhatsAppService;
import com.z7design.secured_guard.exception.BusinessException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
@Transactional
public class InternalMessageService {

    @Autowired
    private InternalMessageRepository internalMessageRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private EmailService emailService;
    
    @Autowired
    private WhatsAppService whatsAppService;

    // Métodos comentados temporariamente para evitar erros de compilação
    // Serão reativados após correção das dependências
    
}
*/