ShiftHub
ShiftHub is a staff scheduling web application I built to explore a practical problem I noticed while working in shift management: finding cover, keeping track of staff availability, and managing shifts efficiently.
The project brings employee records, weekly rotas, shift-cover checks and basic crew tools into one interface. It is a working prototype and portfolio project, rather than a production-ready staff management system.
Features

Manager
- Add, edit and delete employee records, including role, contracted hours and age category.
- Save employees' weekly availability.
- Build a weekly rota and review shifts by date.
- Check proposed shifts against availability, overlapping assignments and a project-defined 40-hour weekly limit.
- Find potential shift cover based on role, availability, existing shifts, scheduled hours and rest periods.
- Compare scheduled hours with contracted hours.
- Review account registrations and assign roles.
- Review pending shift-exchange requests.

Crew
- Sign in to a role-specific dashboard.
- View personal shifts, colleagues scheduled on the selected day and weekly hours.
- Offer a shift for exchange and request another employee's offered shift, subject to eligibility checks and manager approval.
- Clock in/out and view a basic timecard history.
- View account and employment information.

Built with
- HTML5 for page structure
- CSS3 for styling and responsive layouts
- JavaScript (vanilla) for application logic and DOM updates
- Supabase for authentication, account status, approval workflows and employee profile records
- Browser localStorage for prototype scheduling records, employee availability, shift exchanges and timecards
No frontend framework or build step is required.

Running locally
1. Clone or download the repository.
2. Open the project in VS Code.
3. Start a local web server from the project root (for example, using the VS Code Live Server extension).
4. Open html/index.html through that server. For example, with Live Server on port 5500: http://127.0.0.1:5500/html/index.html.
5. Use an approved test account to access the relevant dashboard.
Because the JavaScript uses ES modules and Supabase authentication, use a local web server rather than opening HTML directly with file://.
Supabase setup: The application expects the Supabase project and database tables / account-approval function used during development. A fresh copy of the source is not a standalone, ready-to-register deployment without that configuration. Authentication redirects also need to be allowed in the Supabase project's URL configuration.
How the prototype stores data
Supabase handles sign-in, registration and account approval. Most scheduling data is currently held in localStorage, so it is specific to the browser profile and website origin. A rota created on one device will not automatically appear on another device, and clearing browser data may remove these records.
For the prototype's Crew Rota to find a local employee record, the name in Employee Management needs to match the approved account's name. This is a current limitation, not an intended long-term approach.
This project should be tested with fictional employee data, not used to store real staff schedules or payroll information.

Testing
I manually tested core workflows including:
- Adding employee records
- Creating a valid shift
- Rejecting shifts outside an employee's availability
- Preventing overlapping shifts
- Preventing shifts above the project's 40-hour weekly scheduling limit
- Showing candidate shift-cover eligibility and reasons for ineligibility
- Approving an account and signing in to the Crew Dashboard
- Displaying a Crew member's account name and the team's scheduled shifts
- Offering shifts for exchange and displaying offers to another employee
Other paths, including full end-to-end swap approval, timecard accuracy and behaviour across browsers/devices, need more testing before the application could be considered production-ready.

Future improvements
- Shared scheduling data: Move rotas, availability and timecards into a properly secured Supabase data model so users can access the same 

information across devices.
- Employee identification: Match records using stable user/employee IDs instead of full names.
- Available shift pickup: Let eligible employees request an offered shift without needing to exchange one of their own.
- Scheduling validation: Expand overnight-shift, daily-rest and young-worker checks and clarify overtime / contracted-hour handling.
- Timecards: Associate clock records with specific accounts and use shared, tamper-resistant storage.
- Notifications: Let users know when a shift request or account decision changes.
- User experience: Replace browser alert boxes with consistent inline feedback and provide clearer status labels.
- Testing: Add automated tests for scheduling rules and role-based access, and more thorough manual end-to-end tests.

Why I built it
I noticed an issue at work with how difficult and time-consuming it can be to find cover for shifts, which inspired me to build ShiftHub as a practical solution to this problem. I wanted to turn a real workplace challenge into a useful application. Building ShiftHub has given me experience with JavaScript, handling and validating data, designing separate manager and crew workflows, integrating authentication, and making decisions about what belongs in an initial prototype versus a future release.
Status: Portfolio prototype — under development.
