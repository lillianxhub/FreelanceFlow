package th.ac.kku.freelance_hub.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@ActiveProfiles("test")
class AdminAccessIntegrationTest {
    @Autowired WebApplicationContext context;
    @Autowired JdbcTemplate db;
    ObjectMapper mapper = new ObjectMapper();
    MockMvc mvc;

    @BeforeEach void setup() {
        db.execute("CREATE TABLE IF NOT EXISTS app_feature_settings(id SMALLINT PRIMARY KEY, premium_enforced BOOLEAN NOT NULL, version BIGINT NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
        db.update("DELETE FROM app_feature_settings");
        db.update("INSERT INTO app_feature_settings(id,premium_enforced,version) VALUES(1,false,0)");
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    private String register(String email) throws Exception {
        var result = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(java.util.Map.of("email", email, "password", "test-password-123",
                        "displayName", "Test Account", "firstName", "Test", "lastName", "Account", "phone", "0812345678"))))
                .andExpect(status().isCreated()).andReturn();
        JsonNode body = mapper.readTree(result.getResponse().getContentAsString());
        assertThat(body.at("/data/user/role").asText()).isEqualTo("USER");
        assertThat(body.at("/data/user/plan").asText()).isEqualTo("FREE");
        return body.at("/data/token").asText();
    }

    @Test void adminOnlyAccountDataAndOptimisticPlanChange() throws Exception {
        String adminEmail = "admin-" + UUID.randomUUID() + "@example.com";
        String userEmail = "user-" + UUID.randomUUID() + "@example.com";
        register(adminEmail);
        String userToken = register(userEmail);
        db.update("UPDATE users SET role = 'ADMIN' WHERE email = ?", adminEmail);
        var login = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(java.util.Map.of("email", adminEmail, "password", "test-password-123"))))
                .andExpect(status().isOk()).andReturn();
        String adminToken = mapper.readTree(login.getResponse().getContentAsString()).at("/data/token").asText();

        mvc.perform(get("/api/admin/users")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/users").header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/users/me/features").header("Authorization", "Bearer " + userToken))
                .andExpect(jsonPath("$.data.finance").value(true)).andExpect(jsonPath("$.data.plan").value("FREE"))
                .andExpect(jsonPath("$.data.premiumEnforced").value(false));
        mvc.perform(get("/api/admin/features")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/features").header("Authorization", "Bearer " + userToken)).andExpect(status().isForbidden());
        mvc.perform(patch("/api/admin/features").header("Authorization", "Bearer " + userToken)
                .contentType(MediaType.APPLICATION_JSON).content("{\"premiumEnforced\":true,\"version\":0}"))
                .andExpect(status().isForbidden());
        mvc.perform(patch("/api/admin/features").header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON).content("{\"premiumEnforced\":true}"))
                .andExpect(status().isBadRequest());
        mvc.perform(patch("/api/admin/features").header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON).content("{\"premiumEnforced\":true,\"version\":0}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.version").value(1));
        mvc.perform(patch("/api/admin/features").header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON).content("{\"premiumEnforced\":false,\"version\":0}"))
                .andExpect(status().isConflict());
        mvc.perform(get("/api/users/me/features").header("Authorization", "Bearer " + userToken))
                .andExpect(jsonPath("$.data.finance").value(false));
        mvc.perform(get("/api/users/me/features").header("Authorization", "Bearer " + adminToken))
                .andExpect(jsonPath("$.data.finance").value(true));

        var client = mvc.perform(post("/api/clients").header("Authorization", "Bearer " + userToken)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Private client\"}"))
                .andExpect(status().isCreated()).andReturn();
        String clientId = mapper.readTree(client.getResponse().getContentAsString()).at("/data/id").asText();
        mvc.perform(get("/api/clients").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk()).andExpect(jsonPath("$.meta.total").value(0));
        mvc.perform(get("/api/clients/{id}", clientId).header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound());

        var list = mvc.perform(get("/api/admin/users").param("search", userEmail)
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk()).andExpect(jsonPath("$.meta.total").value(1))
                .andExpect(jsonPath("$.data[0].email").value(userEmail))
                .andReturn();
        String response = list.getResponse().getContentAsString();
        assertThat(response).doesNotContain("phone", "address", "taxId", "passwordHash", "projects", "tasks");
        JsonNode account = mapper.readTree(response).at("/data/0");
        String id = account.get("id").asText();
        long version = account.get("version").asLong();
        String request = mapper.writeValueAsString(java.util.Map.of("plan", "PREMIUM", "version", version));
        mvc.perform(patch("/api/admin/users/{id}/plan", id).header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON).content(request))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.plan").value("PREMIUM"));
        mvc.perform(patch("/api/admin/users/{id}/plan", id).header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON).content(request)).andExpect(status().isConflict());
        mvc.perform(get("/api/users/me/features").header("Authorization", "Bearer " + userToken))
                .andExpect(jsonPath("$.data.finance").value(true));
        mvc.perform(get("/api/admin/summary").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
        mvc.perform(patch("/api/admin/features").header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON).content("{\"premiumEnforced\":false,\"version\":1}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.premiumEnforced").value(false));
        mvc.perform(get("/api/users/me/features").header("Authorization", "Bearer " + userToken))
                .andExpect(jsonPath("$.data.finance").value(true)).andExpect(jsonPath("$.data.plan").value("PREMIUM"));
    }
}
