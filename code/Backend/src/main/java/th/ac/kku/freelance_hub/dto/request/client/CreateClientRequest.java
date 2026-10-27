package th.ac.kku.freelance_hub.dto.request.client;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Data submitted when creating or replacing a client. Ownership comes from authentication. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateClientRequest {

    @NotBlank(message = "Enter a client name")
    @Size(max = 150, message = "Client name must be at most 150 characters")
    private String name;

    @Size(max = 200, message = "Company name must be at most 200 characters")
    private String companyName;

    @Email(message = "Invalid email format")
    @Size(max = 254, message = "Email must be at most 254 characters")
    private String email;

    @Pattern(
        regexp = "^\\+?[0-9() .-]{6,30}$",
        message = "Phone may contain only digits and supported separators"
    )
    private String phone;

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

    private String notes;
}
