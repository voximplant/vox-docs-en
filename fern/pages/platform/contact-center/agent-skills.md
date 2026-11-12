# Agent skills

SmartQueue agent skills allow developers to distribute calls and chat conversations to contact center agents who possess specific proficiencies (such as language fluency, technical specialization, or tier level).

Each skill has a **name** and an assigned **level** ranging from 1 to 5. Agents can hold up to 5 individual skills. To use a skill, you must first create it in the system and then bind it to an existing [agent]().

---

## Create a skill and bind it to an agent

### 1. Create a skill

To create a skill, invoke the [SQ_AddSkill]() Management API method with your application ID and skill name. You can optionally include a descriptive comment (up to 200 characters):

```bash title="Create a skill"
curl -X POST "https://api.voximplant.com/platform_api/SQ_AddSkill" \
  -H "Authorization: Bearer YOUR_GENERATED_JWT" \
  -d "account_id=1&application_id=1&sq_skill_name=mySkill"
```

```json title="Response"
{
  "result": 1
}
```

### 2. Bind a skill to agents

To assign a skill to one or more agents, use the [SQ_BindSkill]() method. Pass your application ID, target agent user IDs (separated by semicolons, or use the `all` keyword to bind to all agents), and an array specifying the skill IDs and proficiency levels (1–5):

```bash title="Bind a skill to agents"
curl -X POST "https://api.voximplant.com/platform_api/SQ_BindSkill" \
  -H "Authorization: Bearer YOUR_GENERATED_JWT" \
  -d "account_id=1&application_id=1&user_id=all&sq_skills=[{\"sq_skill_id\":1,\"sq_skill_level\":1},{\"sq_skill_id\":2,\"sq_skill_level\":5}]"
```

```json title="Response"
{
  "result": 1
}
```

### 3. Unbind a skill

To remove a skill from a specific agent, use the [SQ_UnbindSkill]() method:

```bash title="Unbind a skill from an agent"
curl -X POST "https://api.voximplant.com/platform_api/SQ_UnbindSkill" \
  -H "Authorization: Bearer YOUR_GENERATED_JWT" \
  -d "account_id=1&application_id=1&user_id=1&sq_skill_id=1"
```

```json title="Response"
{
  "result": 1
}
```

---

## Modify or delete a skill

### Modify an existing skill

To update a skill's name or description, use the [SQ_SetSkillInfo]() method:

```bash title="Modify a skill"
curl -X POST "https://api.voximplant.com/platform_api/SQ_SetSkillInfo" \
  -H "Authorization: Bearer YOUR_GENERATED_JWT" \
  -d "account_id=1&application_id=1&sq_skill_id=1&new_sq_skill_name=newSkill"
```

```json title="Response"
{
  "result": 1
}
```

### Delete a skill

To delete a skill, use the [SQ_DelSkill]() method. Deleting a skill automatically unbinds it from all assigned agents:

```bash title="Delete a skill"
curl -X POST "https://api.voximplant.com/platform_api/SQ_DelSkill" \
  -H "Authorization: Bearer YOUR_GENERATED_JWT" \
  -d "account_id=1&application_id=1&sq_skill_id=5"
```

```json title="Response"
{
  "result": 1
}
```