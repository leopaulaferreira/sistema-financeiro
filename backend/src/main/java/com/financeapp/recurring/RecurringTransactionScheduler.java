package com.financeapp.recurring;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Gatilho periódico da Fase 6 — {@code @Scheduled} do próprio Spring Boot,
 * sem broker externo (Kafka/RabbitMQ) nem Quartz: volume e infraestrutura do
 * projeto (ARCHITECTURE.md §3) não justificam esse custo. Frequência
 * conservadora (padrão: de hora em hora) e externalizável via
 * {@code app.recurring-processing.cron}, com default seguro caso a
 * propriedade não seja definida (ver application.yml). Não contém a regra de
 * processamento em si — só aciona {@link RecurringTransactionProcessor}.
 */
@Component
public class RecurringTransactionScheduler {

    private final RecurringTransactionProcessor processor;

    public RecurringTransactionScheduler(RecurringTransactionProcessor processor) {
        this.processor = processor;
    }

    @Scheduled(cron = "${app.recurring-processing.cron:0 0 * * * *}")
    public void run() {
        processor.processDue();
    }
}
