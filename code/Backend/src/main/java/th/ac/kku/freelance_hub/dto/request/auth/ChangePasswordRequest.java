package th.ac.kku.freelance_hub.dto.request.auth;

import java.nio.charset.StandardCharsets;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Credentials required to change the authenticated user's password. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChangePasswordRequest {

    @NotBlank(message = "Enter the current password")
    private String oldPassword;

    @NotBlank(message = "Enter a new password")
    @Size(min = 8, max = 100, message = "New password must be 8–100 characters")
    private String newPassword;

    @AssertTrue(message = "New password must be at most 72 UTF-8 bytes")
    @JsonIgnore
    public boolean isNewPasswordWithinByteLimit() {
        return newPassword == null || newPassword.getBytes(StandardCharsets.UTF_8).length <= 72;
    }
}
