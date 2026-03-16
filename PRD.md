# Project: ChatSQL - Secure Browser-Based SQL Query Interface

## 🤖 AGENT INSTRUCTIONS: READ THIS FIRST
1. You are an autonomous developer operating in a continuous loop.
2. Complete the tasks in the `Implementation Steps` section in exact order.
3. DO NOT skip ahead. DO NOT combine tasks.
4. For each iteration:
   - Read this document to find the first unchecked task `[ ]`.
   - Implement the code required for that task.
   - Run the development server and test the UI to verify functionality.
   - If there are errors, fix the code until they are resolved.
   - Once working, update `progress.txt` with a brief summary of what you did.
   - Mark the task complete in this `PRD.md` file by changing `[ ]` to `[x]`.
   - Commit the changes to git with a descriptive message.
5. If all tasks are marked `[x]`, output EXACTLY: `<promise>COMPLETE</promise>`

---

## 1. Context & Architecture
**Goal:** Build a browser-based web application that acts as a conversational interface for generating and executing SQL queries against SQLite databases, protected by user authentication.
**Deployment:** Vercel (Static Export/Client-Side).
**Tech Stack:**
- Framework: Vite + React (TypeScript)
- Styling: Tailwind CSS
- Authentication: Supabase Auth for username/password logins.
- LLM Integration: OpenRouter API (direct client-side fetch calls, streaming enabled).
- Database Engine: `sql.js` (WebAssembly SQLite to run entirely in the browser).

**Design & Security Rules:**
- **Authentication:** The application MUST be locked behind a login screen. 
- **Client-Side Processing:** Uploaded databases MUST NOT be sent to a server. They are loaded into memory using `sql.js`.
- **API Security:** The OpenRouter API key MUST NOT be hardcoded. Saved to `localStorage`.

---

## 2. Definition of Done
A task is ONLY complete when:
- [ ] The code is fully implemented and passes all TypeScript/ESLint checks.
- [ ] The feature renders in the browser without console errors.
- [ ] The git working tree is clean (committed).

---

## 3. Implementation Steps

### Phase 1: Project Scaffolding & Authentication
- [x] **Task 1:** Initialize a new Vite + React (TypeScript) project. Set up Tailwind CSS and `react-router-dom`. Set up `/login` and `/chat` routes.
- [x] **Task 2:** Integrate the Supabase SDK using environment variables (`.env.local`).
- [x] **Task 3:** Build the Login and Registration UI, wire up the auth logic, and create a Protected Route wrapper for the `/chat` page.

### Phase 2: WebAssembly SQLite & Schema Management
- [x] **Task 4:** Install `sql.js` and copy `sql-wasm.wasm` to the `public/` directory. Create a `DatabaseContext` to hold the active instance.
- [x] **Task 5:** Add a default dummy `.sqlite` database to `public/`. Write a function to load it via `ArrayBuffer` on startup.
- [x] **Task 6:** Create a File Upload component in the sidebar to let users replace the default database with their own `.sqlite` file via the FileReader API.
- [x] **Task 7:** Implement an automatic schema extractor (`SELECT sql FROM sqlite_master;`). Store this DDL in state to pass to the LLM.

### Phase 3: The Plan-to-SQL Streaming Pipeline
- [x] **Task 8:** Create the Chat UI layout. Include a message history area and an input field.
- [x] **Task 9:** Implement a Settings modal for the user to input and save their OpenRouter API Key to `localStorage`.
- [x] **Task 10:** Create an `llmService.ts` function that calls the OpenRouter API with streaming enabled. The system prompt MUST instruct the model to always respond in two distinct sections: first, an `<analytical_plan>` tag containing a natural language step-by-step reasoning of how to solve the prompt using the schema, followed by a `<sql_query>` tag containing ONLY the raw SQL. Here's the prompt:
    "You are an expert SQLite database analyst. Your task is to translate natural language questions into accurate, executable SQLite queries based strictly on the provided database schema.

    ### Data Governance & Execution Rules:
    1. **Schema Strictness:** You must ONLY use the tables and columns explicitly defined in the metadata. Do not invent, guess, or assume the existence of any columns or tables.
    2. **Read-Only:** You are a read-only analyst. You must NEVER generate queries that modify the database (e.g., no INSERT, UPDATE, DELETE, DROP, or ALTER).
    3. **Capitalization & Syntax:** Be meticulous with capitalization. Table and column names must match the schema exactly. Ensure all SQLite queries end with a semicolon.
    4. **Reasoning First:** You must always explain your analytical plan inside <Interpretation> tags before writing the final code inside <Query> tags.

    ### Database Schema:
    {describe_metadata("northwind-SQLite3/csvlist/metadata.csv")}

    ### Examples of Expected Output:

    <example> 
    <Question> For the year 2022, can you provide a summary report of principal offences that includes the total number of offenders and the corresponding court outcomes (both acquitted and guilty)? </Question> 
    <Interpretation> We will generate two subqueries: one using the "offenders_by_offence" table to sum the "count_of_offenders" grouped by "principal_offence" for 2022, and another using the "courts_outcome_by_offence" table to sum "court_finalisation_acquitted" and "court_finalisation_guilty_outcome" for each principal offence for the same year. Finally, we join these subqueries on the "principal_offence" column. </Interpretation> 
    <Query> SELECT O.principal_offence, O.total_offenders, C.total_acquitted, C.total_guilty FROM ( SELECT principal_offence, SUM(count_of_offenders) AS total_offenders FROM offenders_by_offence WHERE year = 2022 GROUP BY principal_offence ) AS O LEFT JOIN ( SELECT principal_offence, SUM(court_finalisation_acquitted) AS total_acquitted, SUM(court_finalisation_guilty_outcome) AS total_guilty FROM courts_outcome_by_offence WHERE year = 2022 GROUP BY principal_offence ) AS C ON O.principal_offence = C.principal_offence; </Query> 
    </example>
        <example2> <Question> For the year 2021, can you provide a breakdown of offender counts by gender? </Question> <Interpretation> We will query the "offenders_by_gender" table, filtering records for 2021. The query groups the data by the "gender" column and sums the "count_of_offenders" to display the total number of offenders for each gender. </Interpretation> <Query> SELECT gender, SUM(count_of_offenders) AS total_offenders FROM offenders_by_gender WHERE year = 2021 GROUP BY gender; </Query> </example2> 
    <example3> <Question> For the year 2020, can you show the total court outcomes (acquitted and guilty) broken down by indigenous status? </Question> <Interpretation> We will use the "courts_outcome_by_indigenousstatus" table. The query filters records for 2020, groups them by "indigenous_status", and sums both "court_finalisation_acquitted" and "court_finalisation_guilty_outcome" to obtain the totals. </Interpretation> <Query> SELECT indigenous_status, SUM(court_finalisation_acquitted) AS total_acquitted, SUM(court_finalisation_guilty_outcome) AS total_guilty FROM courts_outcome_by_indigenousstatus WHERE year = 2020 GROUP BY indigenous_status; </Query> </example3> 
    <example4> <Question> For the year 2022, can you provide the prisoner status breakdown (post-sentence, sentenced, unsentenced) by principal offence? </Question> <Interpretation> We will query the "prisoners_by_offence" table for 2022. The data is grouped by "principal_offence" and the query sums "prisoner_status_post_sentence", "prisoner_status_sentenced", and "prisoner_status_unsentenced" to show the breakdown of prisoner statuses per offence. </Interpretation> <Query> SELECT principal_offence, SUM(prisoner_status_post_sentence) AS total_post_sentence, SUM(prisoner_status_sentenced) AS total_sentenced, SUM(prisoner_status_unsentenced) AS total_unsentenced FROM prisoners_by_offence WHERE year = 2022 GROUP BY principal_offence; </Query> </example4> 
    <example5> <Question> For the year 2021, can you provide a summary of total offender counts by state? </Question> <Interpretation> We will use the "offenders_by_state" table. The query filters for the year 2021, groups the data by "state", and sums the "count_of_offenders" to yield the total offenders per state. </Interpretation> <Query> SELECT state, SUM(count_of_offenders) AS total_offenders FROM offenders_by_state WHERE year = 2021 GROUP BY state; </Query> </example5> 
    <example6> <Question> For the year 2020, can you present the breakdown of prisoner statuses (post-sentence, sentenced, unsentenced) by age group? </Question> <Interpretation> We will query the "prisoners_by_age" table, filtering for records from 2020. The query groups by "age_group" and sums "prisoner_status_post_sentence", "prisoner_status_sentenced", and "prisoner_status_unsentenced" to present the status distribution across age groups. </Interpretation> <Query> SELECT age_group, SUM(prisoner_status_post_sentence) AS total_post_sentence, SUM(prisoner_status_sentenced) AS total_sentenced, SUM(prisoner_status_unsentenced) AS total_unsentenced FROM prisoners_by_age WHERE year = 2020 GROUP BY age_group; </Query> </example6> 
    <example7> <Question> For the year 2021, can you show the court outcomes by gender including totals for acquitted and guilty outcomes? </Question> <Interpretation> We will use the "courts_outcome_by_gender" table. The query filters for 2021, groups by "gender", and sums "court_finalisation_acquitted" and "court_finalisation_guilty_outcome" to show the total outcomes per gender. </Interpretation> <Query> SELECT gender, SUM(court_finalisation_acquitted) AS total_acquitted, SUM(court_finalisation_guilty_outcome) AS total_guilty FROM courts_outcome_by_gender WHERE year = 2021 GROUP BY gender; </Query> </example7> 
    <example8> <Question> For the year 2022, can you provide the number of offenders broken down by indigenous status? </Question> <Interpretation> We will query the "offenders_by_indigenous_status" table, filtering for 2022. The query groups by "indigenous_status" and sums the "count_of_offenders" to obtain totals for each indigenous category. </Interpretation> <Query> SELECT indigenous_status, SUM(count_of_offenders) AS total_offenders FROM offenders_by_indigenous_status WHERE year = 2022 GROUP BY indigenous_status; </Query> </example8> 
    <example9> <Question> For the year 2021, can you provide a breakdown of prisoner statuses (post-sentence, sentenced, unsentenced) by indigenous status? </Question> <Interpretation> We will use the "prisoners_by_indigenous_status" table, filtering records for 2021. The query groups by "indigenous_status" and sums the columns "prisoner_status_post_sentence", "prisoner_status_sentenced", and "prisoner_status_unsentenced" to display the breakdown per indigenous category. </Interpretation> <Query> SELECT indigenous_status, SUM(prisoner_status_post_sentence) AS total_post_sentence, SUM(prisoner_status_sentenced) AS total_sentenced, SUM(prisoner_status_unsentenced) AS total_unsentenced FROM prisoners_by_indigenous_status WHERE year = 2021 GROUP BY indigenous_status; </Query> </example9> 
    <example10> <Question> For the year 2020, can you provide the court outcomes by state showing totals for acquitted and guilty outcomes? </Question> <Interpretation> We will query the "courts_outcome_by_state" table, filtering the records for 2020. The query groups by "state" and sums the "court_finalisation_acquitted" and "court_finalisation_guilty_outcome" columns to provide the aggregated outcomes per state. </Interpretation> <Query> SELECT state, SUM(court_finalisation_acquitted) AS total_acquitted, SUM(court_finalisation_guilty_outcome) AS total_guilty FROM courts_outcome_by_state WHERE year = 2020 GROUP BY state; </Query> </example10>"

    ### Current Request:

    <Question> {prompt} </Question> "



- [x] **Task 11:** Implement a custom UI parser in the Chat component that reads the streaming response. As text arrives, stream the contents of the `<analytical_plan>` into a "Plan" text block. Once the parser detects the `<sql_query>` tag, stream the subsequent text into a distinct, styled code block below the plan.



### Phase 4: Execution & Auditing
- [x] **Task 12:** Implement Auto-Execution. Once the stream finishes completely, automatically take the extracted string from the `<sql_query>` tag and execute it against the active `sql.js` database.
- [x] **Task 13:** Render the results of the executed SQL in a responsive data table directly underneath the code block in the chat UI. Include error handling if the SQL fails.
- [x] **Task 14:** Implement the local audit log. On successful execution, save the timestamp, user ID, natural language prompt, and SQL into an array, and add an "Export Audit Log" CSV button to the sidebar.
- [x] **Task 15:** (Note the the signup/authentication has been removed as this was impeding testing. Can you replace it with the requirement of entering a password "p@ssw0rd" that is shared by all users)
- [x] **Task 16:** Can you start sessions with the northwind_small.sqlite (in main folder) database loaded?
- [x] **Task 17:**  Can you ensure that the tables, their columns and any associated metadata of the active sqlite database is presented in the left sidebar. You can make this expandable, with only table names presented initially.
- [x] **Task 18:** Can you append previous questions and results to new prompts so that answers to previous questions can be referred to in new questions. Also offer the option to start a new chat to clear the context.
- [x] **Task 19:** Can you allow the user to choose which model they use from openAI.  Please add this option in the same place you specify the openrouterAPI key. Please use offer the following models in this order:  
    - google/gemma-3n-e4b-it
    - openai/gpt-oss-120b
    - google/gemini-3-flash-preview
    - google/gemini-3.1-pro-preview
- [x] **Task 20:**  Actually please use offer the following models in this order:
    - openai/gpt-oss-120b
    - google/gemini-3-flash-preview
    - google/gemini-3.1-pro-preview
- [x] **Task 21:**  Can you make a selection of themes available, with at least one made up of more natural, subtle colours. Also add symbols and text for things like to browser tab and the app icon consistent with this theme.
- [x] **Task 22:**   Also add symbols and text for things like to browser tab and the app icon consistent with the function of the web app.
- [x] **Task 23:**  I tried the app on another computer, and there was an issue with size. I could not see the bottom of the screen and therefore the text input box if I did not scroll down. And if I scroll down, I can't see the top banner and feel a bit lost. Can you make the sizing more dynamic to fix this?
- [x] **Task 24:** Could you also ask for the openrouter api at the same time as the password, though make it optional?
- [x] **Task 25:** Could you add a warning on the password page along a banner across the top of the chat page that says: "This application is for demonstration purposes only. Do no enter personal, sensitive, or official information."
- [x] **Task 26:** Can you introduce the option for a chart to be made of the table after it is produced by the query? I'd like, via an api call, the agent to determine the most appropropriate chart and have it rendered using vegalite.
- [x] **Task 27:** Can you introduce the option for the table to be interpretted in natural language.
- [x] **Task 28:** Can you allow the user to request a tts generation of the natural language interpretation, involving a call to the deepinfra kokoro82m tts model.
- [x] **Task 29:** Can you make the size of the vegalite chart more dynamic so that it fits the width and height of the box in which it is placed? 
- [x] **Task 30:** Can you either make the vertical size of the chart container fit the chart (preferred) or make it resizable? The current graph is squished
- [x] **Task 31:** Can you ensure that the colour theme of the chart matches the currently active colour scheme of the app?
- [x] **Task 32:** I've spotted some inaccuracies in the charts. Can you ensure that values are enterred programmatically, rather than by llm text generation. Is there some way to use sqlite or something like that to fill the values in vegalite?
- [x] **Task 33:** For some reason, this seems to have affected the theme - for example, I can read the black text against the dark background. It's also not order the bars. Can you add some context around best-practice visualisaiton practices to improve the choice of chart design and aesthetics?
- [x] **Task 34:** This is better, but I'm now getting a squished chart. Can you see whether this can be addressed in a dynamic way?
- [ ] **Task 35:** Can you add a prompt for the analysis text to make it plain langugae and suitable for tts.  
- [ ] **Task 36:** Can you make the ANALYTICAL PLAN and the SQL QUERY collapse after they are finished generating, while keeping them expandable. 
