package com.z7design.secured_guard.service;

import org.junit.jupiter.api.Test;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class CheckEmployeeWorkPostTest {

    @Test
    public void testCheckEmployeesDirectly() {
        System.out.println("====== DIRECT JDBC DB CHECK ======");
        String url = "jdbc:postgresql://localhost:5432/secured_guard_test";
        String user = "postgres";
        String password = "1234567";
        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement()) {
            String sql = "SELECT e.name, e.work_post_id, wp.name as wp_name, d.name as dept_name " +
                         "FROM employees e " +
                         "LEFT JOIN work_posts wp ON e.work_post_id = wp.id " +
                         "LEFT JOIN departments d ON e.department_id = d.id " +
                         "WHERE e.name LIKE 'ABNER%' OR e.name LIKE 'ABRAAO%' OR e.name LIKE 'ADAILTON%'";
            try (ResultSet rs = stmt.executeQuery(sql)) {
                while (rs.next()) {
                    System.out.printf("RESULT_ROW: Name=%s | WPId=%s | WPName=%s | Dept=%s%n",
                            rs.getString("name"),
                            rs.getString("work_post_id"),
                            rs.getString("wp_name"),
                            rs.getString("dept_name"));
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        System.out.println("==================================");
    }
}
