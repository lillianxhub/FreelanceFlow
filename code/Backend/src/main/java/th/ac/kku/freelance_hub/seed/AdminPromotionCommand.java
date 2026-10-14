package th.ac.kku.freelance_hub.seed;

import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.context.annotation.Configuration;
import th.ac.kku.freelance_hub.security.EmailNormalizer;

/** One-shot operator command; never runs during normal startup. */
public final class AdminPromotionCommand {
    private AdminPromotionCommand() {}

    @Configuration(proxyBeanMethods = false)
    @EnableAutoConfiguration
    @org.springframework.context.annotation.Profile("admin-promotion")
    public static class OperatorConfiguration {}

    public static void main(String[] args) {
        if (args.length != 1 || !args[0].startsWith("--email=")) {
            throw new IllegalArgumentException("Usage: AdminPromotionCommand --email=existing@example.com");
        }
        String email = EmailNormalizer.normalize(args[0].substring("--email=".length()));
        try (ConfigurableApplicationContext context = new SpringApplicationBuilder(OperatorConfiguration.class)
                .web(WebApplicationType.NONE).profiles("admin-promotion").run()) {
            int changed = context.getBean(JdbcTemplate.class).update("""
                    UPDATE users SET role = 'ADMIN', version = version + 1, updated_at = CURRENT_TIMESTAMP
                    WHERE email = ? AND is_active = TRUE AND deleted_at IS NULL AND role <> 'ADMIN'
                    """, email);
            if (changed == 0) {
                Long eligible = context.getBean(JdbcTemplate.class).queryForObject("""
                        SELECT COUNT(*) FROM users WHERE email = ? AND role = 'ADMIN'
                        AND is_active = TRUE AND deleted_at IS NULL
                        """, Long.class, email);
                if (eligible == null || eligible == 0) {
                    throw new IllegalStateException("No active account found for that email");
                }
            }
            System.out.println("Admin account ready: " + email);
        }
    }
}
