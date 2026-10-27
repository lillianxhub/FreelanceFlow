package th.ac.kku.freelance_hub.repository.finance;

import java.time.LocalDate;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

/** Counter allocation must roll back with the document that uses it. */
@Repository
@RequiredArgsConstructor
public class FinanceDocumentNumbers {
    private final JdbcTemplate db;
    @Transactional(propagation=Propagation.MANDATORY)
    public String next(UUID owner,String type,LocalDate date) {
        Integer serial=db.queryForObject("""
                INSERT INTO finance_document_counters(owner_id,type,year,next_value) VALUES(?,?,?,2)
                ON CONFLICT(owner_id,type,year) DO UPDATE SET next_value=finance_document_counters.next_value+1
                RETURNING next_value-1""",Integer.class,owner,type,date.getYear());
        return type+"-"+date.getYear()+"-"+String.format(java.util.Locale.ROOT,"%05d",serial);
    }
}
