# Reportin

The SmartQueue reporting API provides real-time operational metrics and historical analytics for your contact center, including:

* Call counts (answered, missed, abandoned, and declined per queue)
* Active agent headcounts and real-time statuses (Ready, InService, AfterService, DND, Banned)
* Time-in-status tracking per agent (idle time, handle time, post-processing time)
* Queue occupancy and waiting client counts
* Abandonment rates and average wait times (SLA/ASA)

These metrics can be ingested by supervisor dashboards, agent desktop status displays, or external workforce management (WFM) tools.

## Contents

- [Real-time status and metrics](#real-time-status-and-metrics)
- [Historical reports](#historical-reports)
- [Available report metrics](#available-report-metrics)
  - [Call metrics by agent](#call-metrics-by-agent)
  - [Call metrics by queue](#call-metrics-by-queue)
  - [Messaging metrics by agent](#messaging-metrics-by-agent)
  - [Messaging metrics by queue](#messaging-metrics-by-queue)

---

## Real-time status and metrics

### Current queue state

To inspect the real-time state of a SmartQueue—including all assigned agents, active statuses, and time spent in status—use the [GetSQState]() method:

```bash title="Get current queue state"
curl -X POST "https://api.voximplant.com/platform_api/GetSQState" \
  -H "Authorization: Bearer YOUR_GENERATED_JWT" \
  -d "account_id=1&application_id=1&sq_queue_id=1"
```

```json title="Response"
{
  "result": [
    {
      "sq_queue_name": "queue_name_1",
      "sq_queue_id": 1,
      "sq_agents": [
        {
          "user_id": 1,
          "user_name": "user-1",
          "sq_skills": [
            {
              "sq_skill_level": 5,
              "sq_skill_id": 1,
              "sq_skill_name": "skill_1"
            }
          ],
          "sq_statuses": {
            "CALL": {
              "from_date": "2021-05-25 12:24:44",
              "sq_status_name": "ONLINE"
            },
            "IM": {
              "from_date": "2021-05-25 12:24:44",
              "sq_status_name": "ONLINE"
            }
          },
          "user_display_name": "Sylvester Stallone"
        },
        {
          "user_id": 2,
          "user_name": "user-2",
          "sq_skills": [
            {
              "sq_skill_level": 2,
              "sq_skill_id": 3,
              "sq_skill_name": "skill_3"
            }
          ],
          "sq_statuses": {
            "CALL": {
              "from_date": "2021-05-25 12:35:58",
              "sq_status_name": "DND"
            },
            "IM": {
              "from_date": "2021-05-25 12:35:58",
              "sq_status_name": "DND"
            }
          },
          "user_display_name": "Chuck Norris"
        }
      ],
      "tasks": []
    }
  ]
}
```

### 30-minute real-time metrics

To query metrics for a queue over the past 30 minutes, use [GetSmartQueueRealtimeMetrics]():

```bash title="Get 30-minute metrics"
curl -X POST "https://api.voximplant.com/platform_api/GetSmartQueueRealtimeMetrics" \
  -H "Authorization: Bearer YOUR_GENERATED_JWT" \
  -d "account_id=1&application_id=1&report_type=sum_agents_dialing_time"
```

```json title="Response"
{
  "result": [
    {
      "groups": [
        {
          "values": [
            {
              "from_date": "2021-05-25 11:12:44",
              "to_date": "2021-05-25 11:42:44",
              "value": 32
            }
          ]
        }
      ],
      "report_type": "sum_agents_dialing_time"
    }
  ],
  "timezone": "Etc/GMT"
}
```

### 2-day operational history

To retrieve metrics for a queue aggregated over the last 2 days, use [GetSmartQueueDayHistory]():

```bash title="Get 2-day history"
curl -X POST "https://api.voximplant.com/platform_api/GetSmartQueueDayHistory" \
  -H "Authorization: Bearer YOUR_GENERATED_JWT" \
  -d "account_id=1&application_id=1&report_type=sum_agents_online_time"
```

```json title="Response"
{
  "result": [
    {
      "groups": [
        {
          "values": [
            {
              "from_date": "2021-05-24 11:49:47",
              "to_date": "2021-05-25 11:49:47",
              "value": 205
            }
          ]
        }
      ],
      "report_type": "sum_agents_online_time"
        }
  ],
  "timezone": "Etc/GMT"
}
```

The response JSON structure adapts depending on the `report_type` and `group_by` parameters. For all supported metric keys, refer to the [Management API reference]().

---

## Historical reports

For long-term trend analysis, you can generate asynchronous CSV reports covering up to 6 months of historical activity.

Voximplant retains reporting data across the following aggregations:
* **30-minute intervals** for the past 24 hours
* **1-hour intervals** for the past 24 hours
* **Daily intervals** for the past 6 months

To request a historical report, call [RequestSmartQueueHistory]():

```bash title="Request historical report"
curl -X POST "https://api.voximplant.com/platform_api/RequestSmartQueueHistory" \
  -H "Authorization: Bearer YOUR_GENERATED_JWT" \
  -d "account_id=1&application_id=1&sq_queue_id=1&report_type=service_level&max_waiting_sec=6&from_date=2021-03-17 00:00:00&to_date=2021-03-17 22:00:00"
```

```json title="Response"
{
  "result": 1,
  "history_report_id": 533
}
```

This method enqueues report generation and returns a `history_report_id`. Once generated, download the CSV file using [DownloadHistoryReport]():

```bash title="Download report"
curl -X POST "https://api.voximplant.com/platform_api/DownloadHistoryReport" \
  -H "Authorization: Bearer YOUR_GENERATED_JWT" \
  -d "account_id=1&history_report_id=533"
```

<Info title="Report generation times">
Generating a large CSV report covering several months may take several minutes depending on call volume. For real-time operational dashboards, we recommend polling [GetSmartQueueRealtimeMetrics]() or [GetSmartQueueDayHistory]() periodically and ingesting the metrics into your own analytics database.
</Info>

---

## Available report metrics

### Call metrics by agent

The following metrics are available via [GetSmartQueueRealtimeMetrics](), [GetSmartQueueDayHistory](), and [RequestSmartQueueHistory]() when `group_by` is set to `agent`:

* **Occupancy rate** (`occupancy_rate`): Percentage of logged-in time spent handling calls or wrap-up work. Formula: `(IN_SERVICE + AFTER_SERVICE) / (READY + DIALING + IN_SERVICE + AFTER_SERVICE)`.
* **Utilization rate** (`agent_utilization_rate`): Percentage of productive agent time relative to total non-offline time. Formula: `(READY + DIALING + IN_SERVICE + AFTER_SERVICE) / (total time excluding OFFLINE)`.
* **Unanswered calls** (`count_agent_unanswered_calls`): Total calls offered to the agent that were not answered.
* **Handled calls** (`count_handled_calls`): Total calls successfully answered and processed by the agent.
* **Average post-processing time** (`average_after_call_worktime`): Average time spent in `AfterService` status.
* **Min post-processing time** (`min_after_call_worktime`): Minimum time spent in `AfterService` status.
* **Max post-processing time** (`max_after_call_worktime`): Maximum time spent in `AfterService` status.
* **Average reaction time** (`average_reaction_time`): Average time elapsed from call assignment to agent answer.
* **Min reaction time** (`min_reaction_time`): Minimum time elapsed from call assignment to agent answer.
* **Max reaction time** (`max_reaction_time`): Maximum time elapsed from call assignment to agent answer.
* **Average handling time** (`average_handle_time`): Average total call duration including `InService` and `AfterService`.
* **Min handling time** (`min_handle_time`): Minimum total call duration including `InService` and `AfterService`.
* **Max handling time** (`max_handle_time`): Maximum total call duration including `InService` and `AfterService`.
* **Online time** (`sum_agents_online_time`): Total cumulative time spent in `Online` status.
* **Ready time** (`sum_agents_ready_time`): Total cumulative time spent in `Ready` status.
* **DND time** (`sum_agents_dnd_time`): Total cumulative time spent in `DND` (Do Not Disturb) status.
* **Dialing time** (`sum_agents_dialing_time`): Total cumulative time spent in `Dialing` status.
* **In-service time** (`sum_agents_in_service_time`): Total cumulative time spent in `InService` status.
* **After-service time** (`sum_agents_afterservice_time`): Total cumulative time spent in `AfterService` status.
* **Banned time** (`sum_agents_banned_time`): Total cumulative time spent in `Banned` status.
* **Custom status time** (`sum_agents_custom_1_time`): Total cumulative time spent in a specific custom status (replace `1` with the custom status index `1`–`10`).
* **Agent idle time** (`agents_idle_time`): Average duration spent in `Ready` and `Dialing` statuses.
* **Percentile idle times** (`percentile_0_25_agents_idle_time`, `percentile_0_50_agents_idle_time`, `percentile_0_75_agents_idle_time`): 25th, 50th (median), and 75th percentile durations for agent idle time.

### Call metrics by queue

The following metrics are available when `group_by` is set to `queue`:

* **Service level** (`service_level`): Percentage of calls answered within a target threshold (defined by `slPeriod`).
* **Handled calls** (`count_handled_calls`): Total number of calls connected to an agent.
* **Abandoned calls** (`count_abandonment_calls`): Total number of callers who hung up before reaching an agent.
* **Average wait time** (`average_time_in_queue`): Average duration spent waiting in queue across all calls (answered and abandoned).
* **Min wait time** (`min_time_in_queue`): Minimum duration spent waiting in queue.
* **Max wait time** (`max_time_in_queue`): Maximum duration spent waiting in queue.
* **Average answer speed (ASA)** (`average_answer_speed`): Average wait time for answered calls only.
* **Min answer speed** (`min_answer_speed`): Minimum wait time for answered calls only.
* **Max answer speed** (`max_answer_speed`): Maximum wait time for answered calls only.
* **Average handling time** (`average_handle_time`): Average duration of calls in this queue (including wrap-up work).
* **Min handling time** (`min_handle_time`): Minimum call handling duration.
* **Max handling time** (`max_handle_time`): Maximum call handling duration.
* **Average post-processing time** (`average_after_call_worktime`): Average wrap-up time spent by agents after calls in this queue.
* **Min post-processing time** (`min_after_call_worktime`): Minimum wrap-up time.
* **Max post-processing time** (`max_after_call_worktime`): Maximum wrap-up time.

### Messaging reports

#### Messaging metrics by agent (`group_by=agent`)

* **Occupancy rate** (`im_agent_occupancy_rate`): `IN_SERVICE / (READY + IN_SERVICE)`.
* **Utilization rate** (`im_agent_utilization_rate`): `(READY + IN_SERVICE) / (total non-offline time)`.
* **Unanswered chats** (`im_count_agent_unanswered_chats`): Total assigned chats that the agent did not accept.
* **Average reaction time** (`im_average_reaction_time`): Average duration from chat assignment to agent answer.
* **Min reaction time** (`im_min_reaction_time`): Minimum reaction time.
* **Max reaction time** (`im_max_reaction_time`): Maximum reaction time.
* **Online time** (`im_sum_agents_online_time`): Total time spent in `Online` status.
* **Ready time** (`im_sum_agents_ready_time`): Total time spent in `Ready` status.
* **DND time** (`im_sum_agents_dnd_time`): Total time spent in `DND` status.
* **In-service time** (`im_sum_agents_in_service_time`): Total time spent actively handling chats.
* **Banned time** (`im_sum_agents_banned_time`): Total time spent in `Banned` status.
* **Custom status time** (`im_sum_agents_custom_1_time`): Total time spent in custom status `1`–`10`.
* **Blocked chats percentage** (`im_blocked_chats_percentage`): Percentage of chats closed due to system capacity (`NO_AGENT_AVAILABLE`, `WAITING_TIMEOUT`, `MAX_WAITING_TIME_REACHED`, `MAX_QUEUE_SIZE_REACHED`, `INTERNAL_ERROR`).
* **Blocked chats count** (`im_count_blocked_chats`): Total number of chats closed due to system capacity limits.
* **Answered chats rate** (`im_answered_chats_rate`): Percentage of offered chats accepted by agents.
* **Average answer speed** (`im_average_answer_speed`): Average wait time plus dispatching time.
* **Min answer speed** (`im_min_answer_speed`): Minimum wait time plus dispatching time.
* **Max answer speed** (`im_max_answer_speed`): Maximum wait time plus dispatching time.
* **Abandoned chats count** (`im_count_abandonment_chats`): Total incoming chats declined by users before reaching an agent.
* **Lost chats count** (`im_count_lost_chats`): Combined count of blocked and declined chats.

#### Messaging metrics by queue (`group_by=queue`)

* **Service level** (`im_service_level`): Percentage of chats answered within the target threshold (`slPeriod`).
* **Lost chats rate** (`im_lost_chats_rate`): Percentage of total chats lost due to queue abandonment or timeouts.
* **Average wait time** (`average_answer_speed`): Average queue duration before an agent answers.
* **Min wait time** (`min_answer_speed`): Minimum queue duration before an agent answers.
* **Max wait time** (`max_answer_speed`): Maximum queue duration before an agent answers.
* **Average reaction time** (`im_average_reaction_time`): Average time from chat assignment to agent answer.
* **Min reaction time** (`im_min_reaction_time`): Minimum reaction time.
* **Max reaction time** (`im_max_reaction_time`): Maximum reaction time.