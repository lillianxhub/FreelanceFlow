package th.ac.kku.freelance_hub.dto.request.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import th.ac.kku.freelance_hub.security.EmailNormalizer;

/**
 * DTO for user login request
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginRequest {

    @NotBlank(message = "Enter an email address")
    private String email;

    @Email(message = "Invalid email format")
    public String getEmail() {
        return email == null ? null : EmailNormalizer.normalize(email);
    }

    public void setEmail(String email) {
        this.email = email == null ? null : EmailNormalizer.normalize(email);
    }

    @NotBlank(message = "Enter a password")
    private String password;
}
