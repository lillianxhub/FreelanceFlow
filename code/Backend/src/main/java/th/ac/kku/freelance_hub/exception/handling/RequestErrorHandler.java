package th.ac.kku.freelance_hub.exception.handling;

import java.util.Map;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.stereotype.Component;
import org.springframework.web.ErrorResponse;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@Component
public class RequestErrorHandler implements ErrorHandler {
    public int getOrder() { return 400; }
    public Optional<ErrorDescriptor> handle(Exception exception, ErrorContext context) {
        if (context.source() != ErrorContext.Source.MVC) return Optional.empty();
        if (exception instanceof HttpMessageNotReadableException)
            return Optional.of(ErrorDescriptor.of(HttpStatus.BAD_REQUEST,
                    context.isAuthOrClient() ? "INVALID_REQUEST_BODY" : "INVALID_REQUEST", "Invalid request data"));
        if (exception instanceof MethodArgumentTypeMismatchException ex)
            return Optional.of(new ErrorDescriptor(HttpStatus.BAD_REQUEST,
                    context.isClient() ? "INVALID_ARGUMENT" : "INVALID_REQUEST", "Invalid parameters",
                    Map.of("field", ex.getName()), null, null));
        if (exception instanceof ErrorResponse ex) {
            var status = ex.getStatusCode();
            HttpStatus standard = HttpStatus.resolve(status.value());
            String code = standard == null ? "HTTP_" + status.value() : standard.name();
            String message = switch (status.value()) {
                case 400 -> "Invalid request data";
                case 401 -> "Sign in to continue";
                case 403 -> "You cannot perform this action";
                case 404 -> "Requested data not found";
                case 405 -> "Method not allowed";
                case 406 -> "Cannot produce the requested format";
                case 409 -> "Action conflicts with current state";
                case 413 -> "Request payload is too large";
                case 415 -> "Unsupported content type";
                case 429 -> "Too many requests. Try again later.";
                default -> status.is5xxServerError() ? "Internal server error" : "Could not complete the request";
            };
            return Optional.of(new ErrorDescriptor(status, code, message, null, null, ex.getHeaders()));
        }
        return Optional.empty();
    }
}
