package com.z7design.secured_guard.model.prospection;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.z7design.secured_guard.model.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "prospection_searches")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ProspectionSearch {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tipo_busca", nullable = false, length = 50)
    private String tipoBusca; // 'CNPJ', 'SEGMENTO', 'MAPS', 'IA'

    @Column(name = "termo_pesquisa")
    private String termoPesquisa;

    @Column(length = 100)
    private String cidade;

    @Column(length = 10)
    private String uf;

    @Column(length = 100)
    private String segmento;

    @Column(name = "total_encontrados")
    @Builder.Default
    private Integer totalEncontrados = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @JsonIgnoreProperties({"password", "roles", "groups", "company"})
    private User user;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "search", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    @Builder.Default
    private List<ProspectionCompany> companies = new ArrayList<>();
}
