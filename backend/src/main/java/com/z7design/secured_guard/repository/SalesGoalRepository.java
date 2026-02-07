package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.SalesGoal;
import com.z7design.secured_guard.model.enums.GoalPeriod;
import com.z7design.secured_guard.model.enums.GoalType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SalesGoalRepository extends JpaRepository<SalesGoal, UUID> {

    // Metas de um usuário específico
    List<SalesGoal> findByUser_Id(UUID userId);

    // Metas de um usuário para um mês/ano
    @Query("SELECT g FROM SalesGoal g WHERE g.user.id = :userId AND g.referenceMonth = :month AND g.referenceYear = :year")
    List<SalesGoal> findByUserIdAndPeriod(@Param("userId") UUID userId, @Param("month") int month, @Param("year") int year);

    // Metas de equipe (user == null) para um mês/ano
    @Query("SELECT g FROM SalesGoal g WHERE g.user IS NULL AND g.referenceMonth = :month AND g.referenceYear = :year")
    List<SalesGoal> findTeamGoalsByPeriod(@Param("month") int month, @Param("year") int year);

    // Todas as metas de um período
    @Query("SELECT g FROM SalesGoal g WHERE g.referenceMonth = :month AND g.referenceYear = :year")
    List<SalesGoal> findByPeriod(@Param("month") int month, @Param("year") int year);

    // Todas as metas de um ano
    List<SalesGoal> findByReferenceYear(int year);

    // Metas por tipo e período
    @Query("SELECT g FROM SalesGoal g WHERE g.type = :type AND g.referenceYear = :year")
    List<SalesGoal> findByTypeAndYear(@Param("type") GoalType type, @Param("year") int year);
}
