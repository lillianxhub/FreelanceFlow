package th.ac.kku.freelance_hub.exception;

import java.util.Map;
import org.springframework.http.HttpStatus;

public final class FinanceException extends ApiException {
    public FinanceException(HttpStatus status, String code, String message) {
        super(status, code, message, Map.of());
    }
}
