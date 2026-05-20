package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.StockItem;
import com.z7design.secured_guard.model.enums.StockCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StockItemRepository extends JpaRepository<StockItem, UUID> {

    // Buscar por código
    Optional<StockItem> findByCode(String code);

    Optional<StockItem> findByCodeIgnoreCase(String code);

    // Buscar por QR Code
    Optional<StockItem> findByQrCode(String qrCode);

    // Buscar por categoria
    List<StockItem> findByCategory(StockCategory category);

    // Buscar ativos
    @Query("SELECT si FROM StockItem si LEFT JOIN FETCH si.unit WHERE si.active = true")
    List<StockItem> findByActiveTrue();

    // Buscar por categoria e ativos
    @Query("SELECT si FROM StockItem si LEFT JOIN FETCH si.unit WHERE si.category = :category AND si.active = true")
    List<StockItem> findByCategoryAndActiveTrue(@Param("category") StockCategory category);

    // Buscar itens com baixo estoque
    @Query("SELECT si FROM StockItem si LEFT JOIN FETCH si.unit WHERE si.active = true AND si.currentQuantity <= si.minimumQuantity")
    List<StockItem> findLowStockItems();

    // Buscar itens sem estoque
    @Query("SELECT si FROM StockItem si LEFT JOIN FETCH si.unit WHERE si.active = true AND si.currentQuantity = 0")
    List<StockItem> findOutOfStockItems();

    // Buscar por unidade
    List<StockItem> findByUnitId(UUID unitId);

    // Busca com filtros múltiplos
    @Query("SELECT si FROM StockItem si WHERE " +
           "(:category IS NULL OR si.category = :category) AND " +
           "(:active IS NULL OR si.active = :active) AND " +
           "(:unitId IS NULL OR si.unit.id = :unitId) AND " +
           "(:lowStock IS NULL OR (:lowStock = true AND si.currentQuantity <= si.minimumQuantity) OR (:lowStock = false)) AND " +
           "(:searchTerm IS NULL OR " +
           "si.name LIKE %:searchTerm% OR " +
           "si.code LIKE %:searchTerm% OR " +
           "si.description LIKE %:searchTerm% OR " +
           "si.sizeVariation LIKE %:searchTerm%)")
    Page<StockItem> findByFilters(
            @Param("category") StockCategory category,
            @Param("active") Boolean active,
            @Param("unitId") UUID unitId,
            @Param("lowStock") Boolean lowStock,
            @Param("searchTerm") String searchTerm,
            Pageable pageable
    );

    // Busca por texto
    @Query("SELECT si FROM StockItem si WHERE " +
           "si.name LIKE %:searchTerm% OR " +
           "si.code LIKE %:searchTerm% OR " +
           "si.description LIKE %:searchTerm% OR " +
           "si.sizeVariation LIKE %:searchTerm%")
    List<StockItem> findBySearchTerm(@Param("searchTerm") String searchTerm);

    // Estatísticas por categoria
    @Query("SELECT si.category, COUNT(si), SUM(si.currentQuantity) FROM StockItem si WHERE si.active = true GROUP BY si.category")
    List<Object[]> getStatisticsByCategory();

    // Valor total do estoque (custos nulos tratados como zero para não anular o somatório)
    @Query("SELECT COALESCE(SUM(COALESCE(si.currentQuantity, 0) * COALESCE(si.unitCost, 0)), 0) FROM StockItem si WHERE si.active = true")
    Double getTotalStockValue();

    // Contar itens por categoria
    Long countByCategoryAndActiveTrue(StockCategory category);

    // Verificar se código já existe
    boolean existsByCodeAndIdNot(String code, UUID id);

    // Verificar se código existe
    boolean existsByCode(String code);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE StockItem s SET s.currentQuantity = 0 WHERE s.active = true")
    int resetCurrentQuantityAllActive();
}