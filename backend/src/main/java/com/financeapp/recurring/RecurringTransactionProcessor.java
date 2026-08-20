package com.financeapp.recurring;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

/**
 * Orquestra a varredura de recorrências vencidas — não é transacional em si
 * (a transação de banco acontece por regra, em
 * {@link RecurringTransactionService#processDueOccurrences}, chamado através
 * do proxy Spring já que é outro bean). Chamado pelo
 * {@link RecurringTransactionScheduler}; nunca exposto via HTTP.
 */
@Service
public class RecurringTransactionProcessor {

    private static final Logger log = LoggerFactory.getLogger(RecurringTransactionProcessor.class);

    private final RecurringTransactionRepository recurringTransactionRepository;
    private final RecurringTransactionService recurringTransactionService;

    public RecurringTransactionProcessor(RecurringTransactionRepository recurringTransactionRepository,
                                          RecurringTransactionService recurringTransactionService) {
        this.recurringTransactionRepository = recurringTransactionRepository;
        this.recurringTransactionService = recurringTransactionService;
    }

    public void processDue() {
        LocalDate today = LocalDate.now();
        List<Long> dueIds = recurringTransactionRepository.findDueIds(today);
        if (dueIds.isEmpty()) {
            log.debug("Processamento de recorrências: nenhuma regra vencida");
            return;
        }

        log.info("Processamento de recorrências iniciado: {} regra(s) vencida(s)", dueIds.size());
        int totalGenerated = 0;
        int failures = 0;
        for (Long id : dueIds) {
            try {
                totalGenerated += recurringTransactionService.processDueOccurrences(id, today);
            } catch (RuntimeException e) {
                // Uma regra com falha (ex.: violação de constraint inesperada)
                // não pode impedir o processamento das demais — cada regra já
                // roda na própria transação de banco (isolamento por regra).
                failures++;
                log.error("Falha ao processar recorrência id={}: {}", id, e.getClass().getSimpleName());
            }
        }
        log.info("Processamento de recorrências concluído: {} transação(ões) gerada(s), {} falha(s)",
                totalGenerated, failures);
    }
}
