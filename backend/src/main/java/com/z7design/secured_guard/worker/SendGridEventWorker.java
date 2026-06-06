package com.z7design.secured_guard.worker;

import com.z7design.secured_guard.service.sendgrid.SendGridEmailEventProcessor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.stream.Consumer;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.ReadOffset;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.data.redis.connection.stream.StreamReadOptions;
import org.springframework.data.redis.core.StreamOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import com.z7design.secured_guard.config.WorkerComponent;

import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@Slf4j
@WorkerComponent
@RequiredArgsConstructor
public class SendGridEventWorker {

    public static final String STREAM_SENDGRID_EVENTS = "stream:sendgrid:events";
    private static final String CONSUMER_GROUP = "sendgrid-events-group";
    private static final String CONSUMER_NAME = "sendgrid-worker-1";

    private final StringRedisTemplate redisTemplate;
    private final SendGridEmailEventProcessor sendGridEmailEventProcessor;

    @PostConstruct
    public void init() {
        try {
            redisTemplate.opsForStream().createGroup(STREAM_SENDGRID_EVENTS, ReadOffset.from("0"), CONSUMER_GROUP);
            log.info("SendGridEventWorker: consumer group '{}' criado/verificado", CONSUMER_GROUP);
        } catch (Exception e) {
            log.debug("SendGridEventWorker: grupo já existe ou Redis indisponível: {}", e.getMessage());
        }
    }

    @Scheduled(fixedDelay = 400)
    public void consume() {
        try {
            var streamOps = redisTemplate.opsForStream();
            Consumer consumer = Consumer.from(CONSUMER_GROUP, CONSUMER_NAME);
            @SuppressWarnings("unchecked")
            List<MapRecord<String, Object, Object>> records = streamOps.read(
                    consumer,
                    StreamReadOptions.empty().count(30),
                    StreamOffset.create(STREAM_SENDGRID_EVENTS, ReadOffset.from(">")));

            if (records == null || records.isEmpty()) {
                return;
            }
            for (MapRecord<String, Object, Object> streamRecord : records) {
                processOneRecord(streamOps, streamRecord);
            }
        } catch (Exception e) {
            if (System.currentTimeMillis() % 15000 < 400) {
                log.warn("SendGridEventWorker: leitura do stream falhou: {}", e.getMessage());
            }
        }
    }

    private void processOneRecord(
            StreamOperations<String, Object, Object> streamOps,
            MapRecord<String, Object, Object> streamRecord) {
        try {
            String payload = extractPayload(streamRecord.getValue());
            if (payload != null && !payload.isBlank()) {
                sendGridEmailEventProcessor.processPayload(payload);
            }
            streamOps.acknowledge(STREAM_SENDGRID_EVENTS, CONSUMER_GROUP, streamRecord.getId());
        } catch (Exception e) {
            log.error("SendGridEventWorker: falha ao processar registro {}: {}", streamRecord.getId(), e.getMessage(), e);
        }
    }

    private static String extractPayload(Map<Object, Object> value) {
        if (value == null) {
            return null;
        }
        Object p = value.get("payload");
        if (p instanceof String s) {
            return s;
        }
        if (p instanceof byte[] b) {
            return new String(b, StandardCharsets.UTF_8);
        }
        return p != null ? p.toString() : null;
    }
}
