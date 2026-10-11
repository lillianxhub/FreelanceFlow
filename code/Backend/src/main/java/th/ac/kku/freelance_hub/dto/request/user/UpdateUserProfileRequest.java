package th.ac.kku.freelance_hub.dto.request.user;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Optional fields that can be changed on the authenticated user's profile. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateUserProfileRequest {

    @Pattern(regexp = ".*\\S.*", message = "Display name cannot be blank")
    @Size(max = 255, message = "Display name must be at most 255 characters")
    private String displayName;

    @Size(max = 100, message = "First name must be at most 100 characters")
    private String firstName;

    @Size(max = 100, message = "Last name must be at most 100 characters")
    private String lastName;

    @Pattern(
        regexp = "^\\s*$|^\\+?[0-9() .-]{6,20}$",
        message = "Phone may contain only digits or common separators"
    )
    private String phone;

    @Size(max = 500, message = "Address must be at most 500 characters")
    private String address;

    @Size(max = 100, message = "Subdistrict must be at most 100 characters")
    private String subdistrict;

    @Size(max = 100, message = "District must be at most 100 characters")
    private String district;

    @Size(max = 100, message = "Province must be at most 100 characters")
    private String province;

    @Size(max = 20, message = "Postal code must be at most 20 characters")
    private String postalCode;

    @Size(max = 30, message = "Tax ID must be at most 30 characters")
    private String taxId;

    @Size(max = 1000, message = "Bio must be at most 1000 characters")
    private String bio;
}
