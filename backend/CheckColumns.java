import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class CheckColumns {
    public static void main(String[] args) {
        // Read connection string from env or use defaults
        String url = "jdbc:postgresql://localhost:5432/secured_guard_dev";
        String user = "postgressg";
        String password = "dev_password_123456";

        try {
            Connection conn = DriverManager.getConnection(url, user, password);
            Statement stmt = conn.createStatement();
            ResultSet rs = stmt.executeQuery(
                    "SELECT column_name, character_maximum_length " +
                            "FROM information_schema.columns " +
                            "WHERE table_name = 'employees' AND character_maximum_length <= 20");
            System.out.println("Colunas com limite <= 20 na tabela employees:");
            while (rs.next()) {
                System.out.println(rs.getString("column_name") + " -> " + rs.getInt("character_maximum_length"));
            }
            conn.close();
        } catch (Exception e) {
            System.err.println("Erro primário postgresSG_dev: " + e.getMessage());
            try {
                // Tenta fallback pro DB test/local
                Connection conn2 = DriverManager.getConnection("jdbc:postgresql://localhost:5432/secured_guard_test",
                        "postgres", "1234567");
                Statement stmt2 = conn2.createStatement();
                ResultSet rs2 = stmt2.executeQuery(
                        "SELECT column_name, character_maximum_length " +
                                "FROM information_schema.columns " +
                                "WHERE table_name = 'employees' AND character_maximum_length <= 30");
                System.out.println("Colunas com limite <= 30 (test):");
                while (rs2.next()) {
                    System.out.println(rs2.getString("column_name") + " -> " + rs2.getInt("character_maximum_length"));
                }
                conn2.close();
            } catch (Exception ex) {
                System.err.println("Erro secundario postgres_test: " + ex.getMessage());
            }
        }
    }
}
