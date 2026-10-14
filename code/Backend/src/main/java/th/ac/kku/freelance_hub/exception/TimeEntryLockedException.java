package th.ac.kku.freelance_hub.exception;

import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;

public class TimeEntryLockedException extends ApiException {
    public TimeEntryLockedException(UUID id) {
        super(HttpStatus.CONFLICT, "TIME_ENTRY_LOCKED", "Locked time entries cannot be edited", Map.of("id", id));
    }
}
