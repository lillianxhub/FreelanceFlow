package th.ac.kku.freelance_hub.service;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import th.ac.kku.freelance_hub.exception.FinanceException;
import th.ac.kku.freelance_hub.repository.finance.FinanceIdentityRepository;

@Service
@RequiredArgsConstructor
public class FinanceDocumentIdentity {
    private final FinanceIdentityRepository repository;
    private final ObjectMapper json = new ObjectMapper();
    public record Snapshot(String seller, String buyer, String brand) {}

    public Snapshot snapshot(UUID owner, UUID client, String vatRate) {
        var seller = repository.seller(owner);
        var buyer = repository.buyer(owner, client);
        if (new BigDecimal(vatRate).signum() > 0) {
            if (!Boolean.TRUE.equals(seller.get("vat_registered")) || !filled(seller, "business_name", "address", "tax_id"))
                throw invalid("VAT documents require registered business name, address and tax ID");
            if (!filled(buyer, "address", "tax_id"))
                throw invalid("VAT documents require customer address and tax ID");
        }
        return new Snapshot(encode(seller), encode(buyer),
                encode(Map.of("color", seller.get("brand_color"), "footer", seller.get("footer"))));
    }
    private boolean filled(Map<String, Object> values, String... keys) {
        for (String key : keys) if (values.get(key) == null || values.get(key).toString().isBlank()) return false;
        return true;
    }
    private String encode(Object value) {
        try { return json.writeValueAsString(value); }
        catch (JsonProcessingException ex) { throw new IllegalStateException(ex); }
    }
    private FinanceException invalid(String message) {
        return new FinanceException(HttpStatus.BAD_REQUEST, "FINANCE_VALIDATION", message);
    }
}
