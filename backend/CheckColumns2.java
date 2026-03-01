import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class CheckColumns2 {
    public static void main(String[] args) {
        String url = "jdbc:postgresql://localhost:5432/secured_guard_dev";
        String user = "postgressg";
        String password = "dev_password_123456";

        try {
            Connection conn = DriverManager.getConnection(url, user, password);
            Statement stmt = conn.createStatement();
            ResultSet rs = stmt.executeQuery(
                    "SELECT table_name, column_name " +
                            "FROM information_schema.columns " +
                            "WHERE character_maximum_length = 20");
            System.out.println("Todas as colunas varchar(20) do banco de dados:");
            while (rs.next()) {
                System.out.println(rs.getString("table_name") + "." + rs.getString("column_name"));
            }
            conn.close();
        } catch (Exception e) {
            try {
                Connection conn2 = DriverManager.getConnection("jdbc:postgresql://localhost:5432/secured_guard_test",
                        "postgres", "1234567");
                Statement stmt2 = conn2.createStatement();
                ResultSet rs2 = stmt2.executeQuery(
                        "SELECT table_name, column_name " +
                                "FROM information_schema.columns " +
                                "WHERE character_maximum_length = 20");
                System.out.println("Todas as colunas varchar(20) (test):");
                while (rs2.next()) {
                    System.out.println(rs2.getString("table_name") + "." + rs2.getString("column_name"));
                }
                conn2.close();
            } catch (Exception ex) {
            }
        }
    }
}
