import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class CheckEmployees {
    public static void main(String[] args) {
        String[] urls = {
                "jdbc:postgresql://localhost:5432/secured_guard_test",
                "jdbc:postgresql://localhost:5432/secured_guard_dev",
                "jdbc:postgresql://localhost:5432/secured_guard"
        };
        String[] users = { "postgres", "postgressg", "postgres" };
        String[] passwords = { "1234567", "dev_password_123456", "postgres" };

        for (int i = 0; i < urls.length; i++) {
            try (Connection conn = DriverManager.getConnection(urls[i], users[i], passwords[i])) {
                Statement stmt = conn.createStatement();
                ResultSet rs = stmt.executeQuery(
                        "SELECT c.sigla, c.cnpj, COUNT(e.id) as total_employees " +
                                "FROM employees e " +
                                "LEFT JOIN companies c ON e.company_id = c.id " +
                                "GROUP BY c.sigla, c.cnpj " +
                                "ORDER BY total_employees DESC");

                System.out.println("===== DATABASE: " + urls[i] + " =====");
                System.out.println(String.format("%-15s | %-18s | %s", "SIGLA", "CNPJ", "TOTAL"));
                System.out.println("--------------------------------------------------");

                int totalGeral = 0;
                while (rs.next()) {
                    String sigla = rs.getString("sigla");
                    String cnpj = rs.getString("cnpj");
                    int total = rs.getInt("total_employees");
                    totalGeral += total;
                    System.out.println(String.format("%-15s | %-18s | %d",
                            sigla != null ? sigla : "N/A",
                            cnpj != null ? cnpj : "N/A",
                            total));
                }
                System.out.println("--------------------------------------------------");
                System.out.println("TOTAL GERAL: " + totalGeral);

                // Buscar duplicatas por CPF
                ResultSet rsDup = stmt.executeQuery(
                        "SELECT document, COUNT(*) as qtd FROM employees GROUP BY document HAVING COUNT(*) > 1 LIMIT 5");
                boolean hasDups = false;
                while (rsDup.next()) {
                    if (!hasDups) {
                        System.out.println("\nEncontrados CPFs duplicados na base:");
                        hasDups = true;
                    }
                    System.out.println("CPF: " + rsDup.getString("document") + " -> " + rsDup.getInt("qtd") + " vezes");
                }

                break; // Se funcionou no primeiro que conectou, para
            } catch (Exception e) {
                // Tenta o proximo silenciosamente
            }
        }
    }
}
