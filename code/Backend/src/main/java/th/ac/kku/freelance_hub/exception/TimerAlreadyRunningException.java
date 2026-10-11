package th.ac.kku.freelance_hub.exception;

import org.springframework.http.HttpStatus;

public class TimerAlreadyRunningException extends ApiException {
    public TimerAlreadyRunningException() {
        super(HttpStatus.CONFLICT, "TIMER_ALREADY_RUNNING", "A timer is already running. Stop it before starting another.", null);
    }
}
