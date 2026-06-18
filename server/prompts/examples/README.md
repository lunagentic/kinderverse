# 퓨샷(few-shot) 예시 관리

이 폴더에 **JSON 파일을 넣기만 하면** 해당 기능 생성 프롬프트에 예시로 자동 포함됩니다.
채팅에 붙여넣거나 코드를 고칠 필요가 없습니다.

## 규칙

- 위치: `examples/<feature_id>/파일명.json`
  - feature_id: `play_idea`, `mission_card`, `monthly_plan`, `weekly_plan`,
    `daily_plan`, `project_plan`, `project_notice`, `designdoc`
- **JSON 파일 1개 = 예시 1개.**
- 파일명 **사전순**으로 프롬프트에 들어갑니다(`01-`, `02-` 식으로 순서 조절).
- 형식은 해당 기능의 **출력 JSON 스키마(또는 그 항목)** 와 동일하게 작성합니다.
  - 예) `play_idea` 는 놀이 1개(`{title, idea_type, learning_area, materials, intro, method, tips}`).

## 예시 추가하기

1. 잘 나온 결과(카드의 "JSON 편집"에서 복사)나 직접 작성한 JSON을 준비합니다.
2. `examples/play_idea/03-물놀이.json` 처럼 저장합니다.
3. 끝. 다음 생성부터 자동 반영됩니다. (dev 서버는 저장 시 자동 재시작)

## 삭제 / 비활성화

- 파일을 지우거나, 확장자를 `.json` 이 아닌 것으로 바꾸면(예: `.json.off`) 제외됩니다.
