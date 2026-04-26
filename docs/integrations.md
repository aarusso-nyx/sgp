Integrações Sistematech/Search


A - Hooks: Backbone Search deve enviar (Synch/Async) 

A1 - Na validação do Candidato: 
POST /candidates/backlog
{ candidato: FullCandidato; clinica: ClinicaId } => { Recibo }

A2 - No credenciamento de { Clinica, Médico, Psicólogo }
{ credenciado: FullCredenciado; metadata } => { Recibo }



B - Queries: Lists 

B1 - GET /clinica/:clinicaId/backlog 
{ backlog: Backlog[] }

B2 - GET /clinica/:clinicaId/staff
{ medicos: Profissional[], psicologos: Profissional[] }

B3 - GET /clinica/:clinicaId
{ clinica: FullClinica }



C - Mutations: Create/Edit, Enable/Disable
C1 - PATCH/DELETE /clinica/:clinicaId/backlog/:assignmentId 

C2 - PATCH/DELETE /clinica/:clinicaId/staff/:professionalId

C3 - PATCH/DELETE /clinica/:clinicaId

// Enable/Disable
C1a - /clinica/:clinicaId/backlog/:assignmentId 
C2a - /clinica/:clinicaId/staff/:professionalId
C3a - /clinica/:clinicaId



D - Identity Checks (1:n)

POST /identity/verify/:personId 
{ match: boolean }



E - Assessments

POST /assessments
{ assessment: AssessmentData } => { Recibo }