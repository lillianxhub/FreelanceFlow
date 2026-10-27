package th.ac.kku.freelance_hub.integration;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.web.SecurityFilterChain;
import th.ac.kku.freelance_hub.seed.AdminPromotionCommand;
import static org.assertj.core.api.Assertions.assertThat;

class AdminPromotionConfigurationTest {
    @Test void operatorCanStartWithoutHttpSecurity() {
        new ApplicationContextRunner()
                .withInitializer(context -> context.getEnvironment().setActiveProfiles("admin-promotion"))
                .withUserConfiguration(AdminPromotionCommand.OperatorConfiguration.class)
                .withPropertyValues("spring.datasource.url=jdbc:h2:mem:promotion;DB_CLOSE_DELAY=-1",
                        "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa",
                        "spring.datasource.password=", "spring.flyway.enabled=false", "spring.jpa.hibernate.ddl-auto=none")
                .run(context -> {
                    assertThat(context).hasNotFailed().hasSingleBean(JdbcTemplate.class).doesNotHaveBean(SecurityFilterChain.class);
                });
    }
}
