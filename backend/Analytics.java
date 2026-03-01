import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class Analytics {
    public static void main(String[] args) {
        String url = "jdbc:postgresql://localhost:5432/secured_guard_test";
        String user = "postgres";
        String password = "1234567";

        try (Connection conn = DriverManager.getConnection(url, user, password)) {
            Statement stmt = conn.createStatement();

            System.out.println("\n[1] CONTAGEM TOTAL POR EMPRESA");
            ResultSet rsCompany = stmt.executeQuery(
                    "SELECT c.sigla, c.cnpj, COUNT(e.id) as total_employees " +
                            "FROM employees e " +
                            "LEFT JOIN companies c ON e.company_id = c.id " +
                            "GROUP BY c.sigla, c.cnpj " +
                            "ORDER BY total_employees DESC");
            while (rsCompany.next()) {
                System.out.printf("%s (%s): %d\n", rsCompany.getString(1), rsCompany.getString(2), rsCompany.getInt(3));
            }

            System.out.println("\n[2] VERIFICAÇÃO DE DADOS MÍNIMOS");
            ResultSet rsBasic = stmt.executeQuery(
                    "SELECT " +
                            "COUNT(*) FILTER (WHERE document IS NULL OR document = '') as cpf_vazios, " +
                            "COUNT(*) FILTER (WHERE name IS NULL OR name = '') as nomes_vazios, " +
                            "COUNT(*) FILTER (WHERE status = 'ACTIVE') as ativos, " +
                            "COUNT(*) FILTER (WHERE status = 'INACTIVE') as inativos " +
                            "FROM employees");
            if (rsBasic.next()) {
                System.out.printf("CPF Vazios: %d\nNomes Vazios: %d\nAtivos: %d | Inativos: %d\n",
                        rsBasic.getInt(1), rsBasic.getInt(2), rsBasic.getInt(3), rsBasic.getInt(4));
            }

            System.out.println("\n[3] TOP 10 CARGOS (POSITIONS)");
            ResultSet rsPos = stmt.executeQuery(
                    "SELECT p.name, COUNT(e.id) as qtd FROM employees e " +
                            "LEFT JOIN positions p ON e.position_id = p.id " +
                            "GROUP BY p.name ORDER BY qtd DESC LIMIT 10");
            while (rsPos.next()) {
                System.out.printf("%s: %d\n", rsPos.getString(1), rsPos.getInt(2));
            }

            System.out.println("\n[4] TOP 10 DEPARTAMENTOS");
            ResultSet rsDep = stmt.executeQuery(
                    "SELECT d.name, COUNT(e.id) as qtd FROM employees e " +
                            "LEFT JOIN departments d ON e.department_id = d.id " +
                            "GROUP BY d.name ORDER BY qtd DESC LIMIT 10");
            while (rsDep.next()) {
                System.out.printf("%s: %d\n", rsDep.getString(1), rsDep.getInt(2));
            }

        } catch (Exception e) {
        }
    }
}
