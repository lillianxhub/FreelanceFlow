package th.ac.kku.freelance_hub.exception;

import java.util.Map;
import org.springframework.http.HttpStatus;

public class EmailAlreadyExistsException extends ApiException {
    public EmailAlreadyExistsException(String email) {
        super(HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS", "Email already in use", Map.of("field", "email"));
    }
}
