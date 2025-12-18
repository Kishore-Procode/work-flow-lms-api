-- DROP SCHEMA lmsact;

CREATE SCHEMA lmsact AUTHORIZATION postgres;

-- DROP TYPE lmsact.college_status;

CREATE TYPE lmsact.college_status AS ENUM (
	'active',
	'inactive',
	'suspended');

-- DROP TYPE lmsact.college_type;

CREATE TYPE lmsact.college_type AS ENUM (
	'government',
	'private',
	'aided');

-- DROP TYPE lmsact.course_type;

CREATE TYPE lmsact.course_type AS ENUM (
	'BE',
	'ME',
	'BTech',
	'MTech',
	'PhD',
	'Diploma',
	'Certificate');

-- DROP TYPE lmsact.course_type_new;

CREATE TYPE lmsact.course_type_new AS ENUM (
	'undergraduate',
	'postgraduate',
	'diploma');

-- DROP TYPE lmsact.invitation_status;

CREATE TYPE lmsact.invitation_status AS ENUM (
	'pending',
	'accepted',
	'rejected',
	'expired');

-- DROP TYPE lmsact.request_status;

CREATE TYPE lmsact.request_status AS ENUM (
	'pending',
	'approved',
	'rejected');

-- DROP TYPE lmsact.section_status;

CREATE TYPE lmsact.section_status AS ENUM (
	'active',
	'inactive',
	'archived');

-- DROP TYPE lmsact.resource_status;

CREATE TYPE lmsact.resource_status AS ENUM (
	'available',
	'active',
	'needs_attention',
	'archived',
	'replaced',
	'available');

-- DROP TYPE lmsact.user_role;

CREATE TYPE lmsact.user_role AS ENUM (
	'admin',
	'principal',
	'hod',
	'staff',
	'student');

-- DROP TYPE lmsact.user_status;

CREATE TYPE lmsact.user_status AS ENUM (
	'active',
	'inactive',
	'pending');
-- lmsact.contact_info definition

-- Drop table

-- DROP TABLE lmsact.contact_info;

CREATE TABLE lmsact.contact_info (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	"role" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	email varchar(255) NOT NULL,
	phone varchar(20) NOT NULL,
	is_active bool DEFAULT true NULL,
	display_order int4 DEFAULT 0 NULL,
	created_at timestamp DEFAULT now() NULL,
	updated_at timestamp DEFAULT now() NULL,
	CONSTRAINT contact_info_pkey PRIMARY KEY (id)
);


-- lmsact.password_reset_rate_limits definition

-- Drop table

-- DROP TABLE lmsact.password_reset_rate_limits;

CREATE TABLE lmsact.password_reset_rate_limits (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	email varchar(255) NOT NULL,
	request_count int4 DEFAULT 1 NULL,
	window_start timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT password_reset_rate_limits_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_password_reset_rate_limits_email ON lmsact.password_reset_rate_limits USING btree (email);
CREATE INDEX idx_password_reset_rate_limits_window_start ON lmsact.password_reset_rate_limits USING btree (window_start);

-- Table Triggers

create trigger trigger_update_password_reset_rate_limits_updated_at before
update
    on
    lmsact.password_reset_rate_limits for each row execute function update_updated_at_column();


-- lmsact.states definition

-- Drop table

-- DROP TABLE lmsact.states;

CREATE TABLE lmsact.states (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	code varchar(10) NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	created_by varchar(50) NULL,
	updated_by varchar(50) NULL,
	updated_at timestamp NULL,
	active bool NULL,
	CONSTRAINT states_code_key UNIQUE (code),
	CONSTRAINT states_name_key UNIQUE (name),
	CONSTRAINT states_pkey PRIMARY KEY (id)
);


-- lmsact.districts definition

-- Drop table

-- DROP TABLE lmsact.districts;

CREATE TABLE lmsact.districts (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	state_id uuid NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	active bool NULL,
	created_by varchar(50) NULL,
	updated_by varchar(50) NULL,
	updated_on timestamp NULL,
	CONSTRAINT districts_name_state_id_key UNIQUE (name, state_id),
	CONSTRAINT districts_pkey PRIMARY KEY (id),
	CONSTRAINT districts_state_id_fkey FOREIGN KEY (state_id) REFERENCES lmsact.states(id) ON DELETE CASCADE
);
CREATE INDEX idx_districts_state_id ON lmsact.districts USING btree (state_id);


-- lmsact.pincodes definition

-- Drop table

-- DROP TABLE lmsact.pincodes;

CREATE TABLE lmsact.pincodes (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	code varchar(10) NOT NULL,
	area_name varchar(255) NULL,
	district_id uuid NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT pincodes_code_district_id_key UNIQUE (code, district_id),
	CONSTRAINT pincodes_pkey PRIMARY KEY (id),
	CONSTRAINT pincodes_district_id_fkey FOREIGN KEY (district_id) REFERENCES lmsact.districts(id) ON DELETE CASCADE
);
CREATE INDEX idx_pincodes_code ON lmsact.pincodes USING btree (code);
CREATE INDEX idx_pincodes_district_id ON lmsact.pincodes USING btree (district_id);


-- lmsact.academic_years definition

-- Drop table

-- DROP TABLE lmsact.academic_years;

CREATE TABLE lmsact.academic_years (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	course_id uuid NOT NULL,
	year_number int4 NOT NULL,
	year_name varchar(50) NOT NULL,
	is_active bool DEFAULT true NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT academic_years_course_id_year_name_key UNIQUE (course_id, year_name),
	CONSTRAINT academic_years_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_academic_years_course_id ON lmsact.academic_years USING btree (course_id);
CREATE INDEX idx_academic_years_course_year ON lmsact.academic_years USING btree (course_id, year_name);
CREATE INDEX idx_academic_years_year_number ON lmsact.academic_years USING btree (year_number);

-- Table Triggers

create trigger trigger_update_academic_years_updated_at before
update
    on
    lmsact.academic_years for each row execute function update_updated_at_column();


-- lmsact.approval_workflows definition

-- Drop table

-- DROP TABLE lmsact.approval_workflows;

CREATE TABLE lmsact.approval_workflows (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	request_type varchar(50) NOT NULL,
	request_id uuid NOT NULL,
	current_approver_role varchar(50) NOT NULL,
	current_approver_id uuid NULL,
	status varchar(50) DEFAULT 'pending'::character varying NULL,
	approved_by uuid NULL,
	approved_at timestamptz NULL,
	rejection_reason text NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT approval_workflows_pkey PRIMARY KEY (id),
	CONSTRAINT approval_workflows_request_type_check CHECK (((request_type)::text = ANY (ARRAY[('student_registration'::character varying)::text, ('staff_registration'::character varying)::text, ('hod_registration'::character varying)::text, ('principal_registration'::character varying)::text]))),
	CONSTRAINT approval_workflows_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('approved'::character varying)::text, ('rejected'::character varying)::text, ('escalated'::character varying)::text])))
);
CREATE INDEX idx_approval_workflows_approver ON lmsact.approval_workflows USING btree (current_approver_id);
CREATE INDEX idx_approval_workflows_request_id ON lmsact.approval_workflows USING btree (request_id);
CREATE INDEX idx_approval_workflows_status ON lmsact.approval_workflows USING btree (status);


-- lmsact.colleges definition

-- Drop table

-- DROP TABLE lmsact.colleges;

CREATE TABLE lmsact.colleges (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar(255) NOT NULL,
	address text NOT NULL,
	phone varchar(20) NOT NULL,
	email varchar(255) NOT NULL,
	website varchar(255) NULL,
	established varchar(4) NULL,
	principal_id uuid NULL,
	status lmsact.college_status DEFAULT 'active'::college_status NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	principal_name varchar(255) NULL,
	principal_email varchar(255) NULL,
	principal_phone varchar(20) NULL,
	total_students int4 NULL,
	total_faculty int4 NULL,
	college_type lmsact.college_type NULL,
	affiliated_university varchar(255) NULL,
	pincode varchar(10) NULL,
	poc_name varchar(255) NULL,
	poc_email varchar(255) NULL,
	poc_phone varchar(20) NULL,
	poc_designation varchar(100) NULL,
	code varchar(10) NULL,
	spoc_name varchar(255) NULL,
	spoc_email varchar(255) NULL,
	spoc_phone varchar(20) NULL,
	district varchar(100) NULL,
	department_count int4 DEFAULT 0 NULL,
	city uuid NULL,
	state uuid NULL,
	CONSTRAINT chk_college_code_format CHECK (((code IS NULL) OR ((code)::text ~ '^[A-Z0-9]{3,10}$'::text))),
	CONSTRAINT chk_college_pincode_format CHECK (((pincode IS NULL) OR ((pincode)::text ~ '^[0-9]{6}$'::text))),
	CONSTRAINT chk_college_poc_email_format CHECK (((poc_email IS NULL) OR ((poc_email)::text ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'::text))),
	CONSTRAINT chk_college_principal_email_format CHECK (((principal_email IS NULL) OR ((principal_email)::text ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'::text))),
	CONSTRAINT colleges_code_key UNIQUE (code),
	CONSTRAINT colleges_email_key UNIQUE (email),
	CONSTRAINT colleges_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX idx_colleges_code ON lmsact.colleges USING btree (code);
CREATE INDEX idx_colleges_college_type ON lmsact.colleges USING btree (college_type);
CREATE INDEX idx_colleges_pincode ON lmsact.colleges USING btree (pincode);
CREATE INDEX idx_colleges_poc_email ON lmsact.colleges USING btree (poc_email);
CREATE INDEX idx_colleges_principal_email ON lmsact.colleges USING btree (principal_email);
CREATE INDEX idx_colleges_principal_id ON lmsact.colleges USING btree (principal_id);
CREATE INDEX idx_colleges_status ON lmsact.colleges USING btree (status);

-- Table Triggers

create trigger update_colleges_updated_at before
update
    on
    lmsact.colleges for each row execute function update_updated_at_column();


-- lmsact.contact_messages definition

-- Drop table

-- DROP TABLE lmsact.contact_messages;

CREATE TABLE lmsact.contact_messages (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	email varchar(255) NOT NULL,
	phone varchar(20) NULL,
	subject varchar(500) NOT NULL,
	category varchar(50) NOT NULL,
	message text NOT NULL,
	priority varchar(20) DEFAULT 'medium'::character varying NOT NULL,
	status varchar(20) DEFAULT 'pending'::character varying NOT NULL,
	user_id uuid NULL,
	user_role varchar(50) NULL,
	admin_response text NULL,
	responded_by uuid NULL,
	responded_at timestamptz NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT contact_messages_category_check CHECK (((category)::text = ANY ((ARRAY['technical'::character varying, 'tree-monitoring'::character varying, 'account'::character varying, 'general'::character varying, 'feedback'::character varying, 'emergency'::character varying])::text[]))),
	CONSTRAINT contact_messages_pkey PRIMARY KEY (id),
	CONSTRAINT contact_messages_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying])::text[]))),
	CONSTRAINT contact_messages_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'in-progress'::character varying, 'resolved'::character varying, 'closed'::character varying])::text[])))
);
CREATE INDEX idx_contact_messages_category ON lmsact.contact_messages USING btree (category);
CREATE INDEX idx_contact_messages_created_at ON lmsact.contact_messages USING btree (created_at DESC);
CREATE INDEX idx_contact_messages_email ON lmsact.contact_messages USING btree (email);
CREATE INDEX idx_contact_messages_priority ON lmsact.contact_messages USING btree (priority);
CREATE INDEX idx_contact_messages_status ON lmsact.contact_messages USING btree (status);
CREATE INDEX idx_contact_messages_user_id ON lmsact.contact_messages USING btree (user_id);

-- Table Triggers

create trigger trigger_update_contact_messages_updated_at before
update
    on
    lmsact.contact_messages for each row execute function update_contact_messages_updated_at();


-- lmsact.courses definition

-- Drop table

-- DROP TABLE lmsact.courses;

CREATE TABLE lmsact.courses (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar(255) NOT NULL,
	code varchar(10) NOT NULL,
	duration_years int4 NULL,
	college_id uuid NOT NULL,
	is_active bool DEFAULT true NULL,
	description text NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	department_id uuid NULL,
	"type" lmsact.course_type_new NULL,
	CONSTRAINT courses_college_id_code_key UNIQUE (college_id, code),
	CONSTRAINT courses_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_courses_college_active ON lmsact.courses USING btree (college_id, is_active);
CREATE INDEX idx_courses_college_id ON lmsact.courses USING btree (college_id);
CREATE INDEX idx_courses_department_id ON lmsact.courses USING btree (department_id);
CREATE INDEX idx_courses_is_active ON lmsact.courses USING btree (is_active);

-- Table Triggers

create trigger trigger_update_courses_updated_at before
update
    on
    lmsact.courses for each row execute function update_updated_at_column();


-- lmsact.csv_upload_logs definition

-- Drop table

-- DROP TABLE lmsact.csv_upload_logs;

CREATE TABLE lmsact.csv_upload_logs (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	uploaded_by uuid NOT NULL,
	file_name varchar(255) NOT NULL,
	file_size int4 NULL,
	upload_type varchar(50) NOT NULL,
	total_records int4 DEFAULT 0 NULL,
	successful_records int4 DEFAULT 0 NULL,
	failed_records int4 DEFAULT 0 NULL,
	error_details jsonb NULL,
	status varchar(20) DEFAULT 'processing'::character varying NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	completed_at timestamptz NULL,
	CONSTRAINT csv_upload_logs_pkey PRIMARY KEY (id),
	CONSTRAINT csv_upload_logs_status_check CHECK (((status)::text = ANY ((ARRAY['processing'::character varying, 'completed'::character varying, 'failed'::character varying])::text[])))
);
CREATE INDEX idx_csv_upload_logs_status ON lmsact.csv_upload_logs USING btree (status);
CREATE INDEX idx_csv_upload_logs_upload_type ON lmsact.csv_upload_logs USING btree (upload_type);
CREATE INDEX idx_csv_upload_logs_uploaded_by ON lmsact.csv_upload_logs USING btree (uploaded_by);


-- lmsact.departments definition

-- Drop table

-- DROP TABLE lmsact.departments;

CREATE TABLE lmsact.departments (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar(255) NOT NULL,
	code varchar(10) NOT NULL,
	college_id uuid NOT NULL,
	hod_id uuid NULL,
	total_students int4 DEFAULT 0 NULL,
	total_staff int4 DEFAULT 0 NULL,
	established varchar(4) NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	course_id uuid NULL,
	is_active bool DEFAULT true NULL,
	is_custom bool DEFAULT false NULL,
	CONSTRAINT departments_college_id_code_key UNIQUE (college_id, code),
	CONSTRAINT departments_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_departments_college_id ON lmsact.departments USING btree (college_id);
CREATE INDEX idx_departments_course_id ON lmsact.departments USING btree (course_id);
CREATE INDEX idx_departments_hod_id ON lmsact.departments USING btree (hod_id);

-- Table Triggers

create trigger update_departments_updated_at before
update
    on
    lmsact.departments for each row execute function update_updated_at_column();


-- lmsact.file_uploads definition

-- Drop table

-- DROP TABLE lmsact.file_uploads;

CREATE TABLE lmsact.file_uploads (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	original_name varchar(255) NOT NULL,
	stored_name varchar(255) NOT NULL,
	file_path varchar(500) NOT NULL,
	mime_type varchar(100) NOT NULL,
	file_size int4 NOT NULL,
	uploaded_by uuid NOT NULL,
	upload_type varchar(50) NOT NULL,
	related_entity_id uuid NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT file_uploads_pkey PRIMARY KEY (id),
	CONSTRAINT file_uploads_upload_type_check CHECK (((upload_type)::text = ANY (ARRAY[('tree_image'::character varying)::text, ('profile_image'::character varying)::text, ('document'::character varying)::text])))
);
CREATE INDEX idx_file_uploads_entity ON lmsact.file_uploads USING btree (related_entity_id);
CREATE INDEX idx_file_uploads_related_entity ON lmsact.file_uploads USING btree (related_entity_id);
CREATE INDEX idx_file_uploads_type ON lmsact.file_uploads USING btree (upload_type);
CREATE INDEX idx_file_uploads_uploaded_by ON lmsact.file_uploads USING btree (uploaded_by);


-- lmsact.guidelines definition

-- Drop table

-- DROP TABLE lmsact.guidelines;

CREATE TABLE lmsact.guidelines (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	title varchar(255) NOT NULL,
	description text NOT NULL,
	icon varchar(100) NOT NULL,
	tips jsonb DEFAULT '[]'::jsonb NOT NULL,
	display_order int4 DEFAULT 0 NULL,
	is_active bool DEFAULT true NULL,
	created_by uuid NULL,
	created_at timestamp DEFAULT now() NULL,
	updated_at timestamp DEFAULT now() NULL,
	CONSTRAINT guidelines_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_guidelines_active_order ON lmsact.guidelines USING btree (is_active, display_order);


-- lmsact.invitations definition

-- Drop table

-- DROP TABLE lmsact.invitations;

CREATE TABLE lmsact.invitations (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	email varchar(255) NOT NULL,
	"role" lmsact.user_role NOT NULL,
	status lmsact.invitation_status DEFAULT 'pending'::invitation_status NULL,
	sent_by uuid NOT NULL,
	sent_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	accepted_at timestamptz NULL,
	rejected_at timestamptz NULL,
	expires_at timestamptz DEFAULT CURRENT_TIMESTAMP + '7 days'::interval NULL,
	college_id uuid NOT NULL,
	department_id uuid NULL,
	invitation_token varchar(255) NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	"name" varchar(100) NULL,
	phone varchar(20) NULL,
	year_of_study int4 NULL,
	"section" varchar(10) NULL,
	roll_number varchar(50) NULL,
	designation varchar(100) NULL,
	qualification varchar(200) NULL,
	experience int4 NULL,
	academic_year_id uuid NULL,
	course_id uuid NULL,
	section_id uuid NULL,
	CONSTRAINT chk_staff_experience CHECK (((experience IS NULL) OR ((experience >= 0) AND (experience <= 50)))),
	CONSTRAINT chk_student_roll_number CHECK (((role <> 'student'::user_role) OR ((role = 'student'::user_role) AND (roll_number IS NOT NULL) AND (length(TRIM(BOTH FROM roll_number)) > 0)))),
	CONSTRAINT chk_student_section CHECK (((role <> 'student'::user_role) OR ((role = 'student'::user_role) AND (section IS NOT NULL) AND (length(TRIM(BOTH FROM section)) > 0)))),
	CONSTRAINT chk_student_year_of_study CHECK (((role <> 'student'::user_role) OR ((role = 'student'::user_role) AND (year_of_study IS NOT NULL) AND ((year_of_study >= 1) AND (year_of_study <= 4))))),
	CONSTRAINT invitations_invitation_token_key UNIQUE (invitation_token),
	CONSTRAINT invitations_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_invitations_college_id ON lmsact.invitations USING btree (college_id);
CREATE INDEX idx_invitations_course_id ON lmsact.invitations USING btree (course_id);
CREATE INDEX idx_invitations_designation ON lmsact.invitations USING btree (designation) WHERE (role = ANY (ARRAY['staff'::user_role, 'hod'::user_role]));
CREATE INDEX idx_invitations_email ON lmsact.invitations USING btree (email);
CREATE INDEX idx_invitations_role ON lmsact.invitations USING btree (role);
CREATE INDEX idx_invitations_section_id ON lmsact.invitations USING btree (section_id);
CREATE INDEX idx_invitations_status ON lmsact.invitations USING btree (status);
CREATE INDEX idx_invitations_token ON lmsact.invitations USING btree (invitation_token);
CREATE INDEX idx_invitations_year_section ON lmsact.invitations USING btree (year_of_study, section) WHERE (role = 'student'::user_role);

-- Table Triggers

create trigger trg_validate_invitation_data before
insert
    or
update
    on
    lmsact.invitations for each row execute function validate_invitation_data();


-- lmsact.notifications definition

-- Drop table

-- DROP TABLE lmsact.notifications;

CREATE TABLE lmsact.notifications (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	user_id uuid NOT NULL,
	title varchar(255) NOT NULL,
	message text NOT NULL,
	"type" varchar(50) NOT NULL,
	"read" bool DEFAULT false NULL,
	related_entity_type varchar(50) NULL,
	related_entity_id uuid NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT notifications_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_notifications_read ON lmsact.notifications USING btree (read);
CREATE INDEX idx_notifications_type ON lmsact.notifications USING btree (type);
CREATE INDEX idx_notifications_user_id ON lmsact.notifications USING btree (user_id);


-- lmsact.otp_verifications definition

-- Drop table

-- DROP TABLE lmsact.otp_verifications;

CREATE TABLE lmsact.otp_verifications (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	identifier varchar(255) NOT NULL,
	otp_hash varchar(255) NOT NULL,
	"type" varchar(10) NOT NULL,
	purpose varchar(50) NOT NULL,
	user_id uuid NULL,
	attempts int4 DEFAULT 0 NULL,
	max_attempts int4 DEFAULT 3 NULL,
	expires_at timestamptz NOT NULL,
	verified bool DEFAULT false NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT check_purpose_values CHECK (((purpose)::text = ANY ((ARRAY['registration'::character varying, 'login'::character varying, 'password_reset'::character varying, 'phone_verification'::character varying, 'email_verification'::character varying])::text[]))),
	CONSTRAINT otp_verifications_pkey PRIMARY KEY (id),
	CONSTRAINT otp_verifications_purpose_check CHECK (((purpose)::text = ANY ((ARRAY['registration'::character varying, 'login'::character varying, 'password_reset'::character varying, 'phone_verification'::character varying, 'email_verification'::character varying])::text[]))),
	CONSTRAINT otp_verifications_type_check CHECK (((type)::text = ANY ((ARRAY['email'::character varying, 'sms'::character varying])::text[])))
);
CREATE INDEX idx_otp_verifications_active ON lmsact.otp_verifications USING btree (identifier, purpose, verified, expires_at);
CREATE INDEX idx_otp_verifications_expires_at ON lmsact.otp_verifications USING btree (expires_at);
CREATE INDEX idx_otp_verifications_identifier ON lmsact.otp_verifications USING btree (identifier);
CREATE INDEX idx_otp_verifications_identifier_purpose ON lmsact.otp_verifications USING btree (identifier, purpose);
CREATE INDEX idx_otp_verifications_purpose ON lmsact.otp_verifications USING btree (purpose);
CREATE INDEX idx_otp_verifications_user_id ON lmsact.otp_verifications USING btree (user_id);
CREATE INDEX idx_otp_verifications_verified ON lmsact.otp_verifications USING btree (verified);

-- Table Triggers

create trigger trigger_update_otp_verifications_updated_at before
update
    on
    lmsact.otp_verifications for each row execute function update_otp_verifications_updated_at();


-- lmsact.password_reset_logs definition

-- Drop table

-- DROP TABLE lmsact.password_reset_logs;

CREATE TABLE lmsact.password_reset_logs (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	user_id uuid NOT NULL,
	email varchar(255) NOT NULL,
	reset_method varchar(20) DEFAULT 'otp'::character varying NOT NULL,
	ip_address inet NULL,
	user_agent text NULL,
	success bool DEFAULT false NULL,
	failure_reason text NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT password_reset_logs_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_password_reset_logs_created_at ON lmsact.password_reset_logs USING btree (created_at);
CREATE INDEX idx_password_reset_logs_email ON lmsact.password_reset_logs USING btree (email);
CREATE INDEX idx_password_reset_logs_success ON lmsact.password_reset_logs USING btree (success);
CREATE INDEX idx_password_reset_logs_user_id ON lmsact.password_reset_logs USING btree (user_id);


-- lmsact.registration_requests definition

-- Drop table

-- DROP TABLE lmsact.registration_requests;

CREATE TABLE lmsact.registration_requests (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	email varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" lmsact.user_role NOT NULL,
	phone varchar(20) NULL,
	status lmsact.request_status DEFAULT 'pending'::request_status NULL,
	requested_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	reviewed_at timestamptz NULL,
	reviewed_by uuid NULL,
	college_id uuid NULL,
	department_id uuid NULL,
	"class" varchar(50) NULL,
	roll_number varchar(50) NULL,
	college_name varchar(255) NULL,
	rejection_reason text NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	assigned_approver_id uuid NULL,
	approval_level int4 DEFAULT 1 NULL,
	course_id uuid NULL,
	section_id uuid NULL,
	academic_year_id uuid NULL,
	semester varchar(20) NULL,
	batch_year int4 NULL,
	year_of_study varchar(20) NULL,
	address_line1 text NULL,
	address_line2 text NULL,
	city varchar(100) NULL,
	state varchar(100) NULL,
	district varchar(100) NULL,
	pincode varchar(10) NULL,
	aadhar_number varchar(12) NULL,
	date_of_birth date NULL,
	spoc_name varchar(255) NULL,
	spoc_email varchar(255) NULL,
	spoc_phone varchar(20) NULL,
	password_hash varchar(255) NULL,
	CONSTRAINT chk_aadhar_format CHECK (((aadhar_number IS NULL) OR ((aadhar_number)::text ~ '^[0-9]{12}$'::text))),
	CONSTRAINT chk_pincode_format CHECK (((pincode IS NULL) OR ((pincode)::text ~ '^[0-9]{6}$'::text))),
	CONSTRAINT registration_requests_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_registration_requests_academic_year_id ON lmsact.registration_requests USING btree (academic_year_id);
CREATE INDEX idx_registration_requests_batch_year ON lmsact.registration_requests USING btree (batch_year);
CREATE INDEX idx_registration_requests_college_id ON lmsact.registration_requests USING btree (college_id);
CREATE INDEX idx_registration_requests_course_id ON lmsact.registration_requests USING btree (course_id);
CREATE INDEX idx_registration_requests_district ON lmsact.registration_requests USING btree (district);
CREATE INDEX idx_registration_requests_pincode ON lmsact.registration_requests USING btree (pincode);
CREATE INDEX idx_registration_requests_section_id ON lmsact.registration_requests USING btree (section_id);
CREATE INDEX idx_registration_requests_semester ON lmsact.registration_requests USING btree (semester);
CREATE INDEX idx_registration_requests_state ON lmsact.registration_requests USING btree (state);
CREATE INDEX idx_registration_requests_status ON lmsact.registration_requests USING btree (status);
CREATE INDEX idx_registration_requests_year_of_study ON lmsact.registration_requests USING btree (year_of_study);


-- lmsact.resources definition

-- Drop table

-- DROP TABLE lmsact.resources;

CREATE TABLE lmsact.resources (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	category varchar(255) NOT NULL,
	title varchar(255) NOT NULL,
	description text NOT NULL,
	"type" varchar(50) NOT NULL,
	"size" varchar(20) NULL,
	link text NOT NULL,
	display_order int4 DEFAULT 0 NULL,
	is_active bool DEFAULT true NULL,
	created_by uuid NULL,
	created_at timestamp DEFAULT now() NULL,
	updated_at timestamp DEFAULT now() NULL,
	CONSTRAINT resources_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_resources_active ON lmsact.resources USING btree (is_active);
CREATE INDEX idx_resources_category_order ON lmsact.resources USING btree (category, display_order);


-- lmsact.sections definition

-- Drop table

-- DROP TABLE lmsact.sections;

CREATE TABLE lmsact.sections (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar(50) NOT NULL,
	course_id uuid NOT NULL,
	department_id uuid NOT NULL,
	academic_year_id uuid NOT NULL,
	class_in_charge_id uuid NULL,
	max_students int4 DEFAULT 60 NULL,
	current_students int4 DEFAULT 0 NULL,
	status lmsact.section_status DEFAULT 'active'::section_status NULL,
	academic_session varchar(20) NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT sections_course_id_department_id_academic_year_id_name_acad_key UNIQUE (course_id, department_id, academic_year_id, name, academic_session),
	CONSTRAINT sections_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_sections_academic_year_id ON lmsact.sections USING btree (academic_year_id);
CREATE INDEX idx_sections_class_in_charge_id ON lmsact.sections USING btree (class_in_charge_id);
CREATE INDEX idx_sections_course_id ON lmsact.sections USING btree (course_id);
CREATE INDEX idx_sections_course_year ON lmsact.sections USING btree (course_id, academic_year_id);
CREATE INDEX idx_sections_department_id ON lmsact.sections USING btree (department_id);
CREATE INDEX idx_sections_status ON lmsact.sections USING btree (status);

-- Table Triggers

create trigger trigger_update_sections_updated_at before
update
    on
    lmsact.sections for each row execute function update_updated_at_column();


-- lmsact.student_batches definition

-- Drop table

-- DROP TABLE lmsact.student_batches;

CREATE TABLE lmsact.student_batches (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	batch_year int4 NOT NULL,
	department_id uuid NOT NULL,
	total_students int4 DEFAULT 0 NULL,
	enrolled_students int4 DEFAULT 0 NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT student_batches_batch_year_department_id_key UNIQUE (batch_year, department_id),
	CONSTRAINT student_batches_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_student_batches_batch_year ON lmsact.student_batches USING btree (batch_year);
CREATE INDEX idx_student_batches_department_id ON lmsact.student_batches USING btree (department_id);

-- Table Triggers

create trigger trigger_update_student_batches_updated_at before
update
    on
    lmsact.student_batches for each row execute function update_updated_at_column();


-- lmsact.resource_media definition

-- Drop table

-- DROP TABLE lmsact.resource_media;

CREATE TABLE lmsact.resource_media (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	resource_id uuid NOT NULL,
	student_id uuid NOT NULL,
	media_url varchar(500) NOT NULL,
	media_type varchar(50) DEFAULT 'milestone'::character varying NULL,
	caption text NULL,
	upload_date timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	file_size int4 NULL,
	file_name varchar(255) NULL,
	mime_type varchar(100) NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT resource_media_media_type_check CHECK (((media_type)::text = ANY (ARRAY[('initial'::character varying)::text, ('milestone'::character varying)::text, ('assessment'::character varying)::text, ('completion'::character varying)::text]))),
	CONSTRAINT resource_media_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_resource_media_student_id ON lmsact.resource_media USING btree (student_id);
CREATE INDEX idx_resource_media_resource_id ON lmsact.resource_media USING btree (resource_id);
CREATE INDEX idx_resource_media_upload_date ON lmsact.resource_media USING btree (upload_date);


-- lmsact.learning_progress definition

-- Drop table

-- DROP TABLE lmsact.learning_progress;

CREATE TABLE lmsact.learning_progress (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	resource_id uuid NOT NULL,
	user_id uuid NOT NULL,
	tracking_date date DEFAULT CURRENT_DATE NOT NULL,
	completion_percentage numeric(5, 2) NULL,
	time_spent_minutes numeric(10, 2) NULL,
	progress_status varchar(50) DEFAULT 'excellent'::character varying NOT NULL,
	resources_accessed bool DEFAULT false NULL,
	assignments_completed bool DEFAULT false NULL,
	assessments_taken bool DEFAULT false NULL,
	challenges_faced text NULL,
	learning_difficulties text NULL,
	study_notes text NULL,
	learning_environment varchar(100) NULL,
	media_url text NULL,
	media_type varchar(20) DEFAULT 'milestone'::character varying NULL,
	tracking_type varchar(20) DEFAULT 'learning'::character varying NULL,
	description text NULL,
	location_latitude numeric(10, 8) NULL,
	location_longitude numeric(11, 8) NULL,
	verified bool DEFAULT false NULL,
	verified_by uuid NULL,
	verified_at timestamptz NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT learning_progress_progress_status_check CHECK (((progress_status)::text = ANY ((ARRAY['excellent'::character varying, 'struggling'::character varying, 'needs_help'::character varying, 'blocked'::character varying, 'improving'::character varying])::text[]))),
	CONSTRAINT learning_progress_media_type_check CHECK (((media_type)::text = ANY ((ARRAY['milestone'::character varying, 'challenge'::character varying, 'general'::character varying, 'before'::character varying, 'after'::character varying])::text[]))),
	CONSTRAINT learning_progress_tracking_type_check CHECK (((tracking_type)::text = ANY ((ARRAY['learning'::character varying, 'challenge'::character varying, 'general'::character varying, 'review'::character varying])::text[]))),
	CONSTRAINT learning_progress_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_learning_progress_created_at ON lmsact.learning_progress USING btree (created_at DESC);
CREATE INDEX idx_learning_progress_progress_status ON lmsact.learning_progress USING btree (progress_status);
CREATE INDEX idx_learning_progress_media_url ON lmsact.learning_progress USING btree (media_url) WHERE (media_url IS NOT NULL);
CREATE INDEX idx_learning_progress_user_id ON lmsact.learning_progress USING btree (user_id);
CREATE INDEX idx_learning_progress_verified ON lmsact.learning_progress USING btree (verified);

-- Table Triggers

create trigger trigger_update_tree_monitoring_updated_at before
update
    on
    lmsact.tree_monitoring for each row execute function update_tree_monitoring_updated_at();


-- lmsact.tree_monitoring_records definition

-- Drop table

-- DROP TABLE lmsact.tree_monitoring_records;

CREATE TABLE lmsact.tree_monitoring_records (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	tree_id uuid NOT NULL,
	student_id uuid NOT NULL,
	monitoring_date date NOT NULL,
	height_cm numeric(8, 2) NULL,
	trunk_diameter_cm numeric(8, 2) NULL,
	health_status varchar(50) NOT NULL,
	watered bool DEFAULT false NULL,
	fertilized bool DEFAULT false NULL,
	pruned bool DEFAULT false NULL,
	pest_issues text NULL,
	disease_issues text NULL,
	general_notes text NULL,
	weather_conditions varchar(100) NULL,
	verified_by uuid NULL,
	verified_at timestamptz NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT tree_monitoring_records_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_tree_monitoring_date ON lmsact.tree_monitoring_records USING btree (monitoring_date);
CREATE INDEX idx_tree_monitoring_student_id ON lmsact.tree_monitoring_records USING btree (student_id);
CREATE INDEX idx_tree_monitoring_tree_id ON lmsact.tree_monitoring_records USING btree (tree_id);


-- lmsact.tree_photos definition

-- Drop table

-- DROP TABLE lmsact.tree_photos;

CREATE TABLE lmsact.tree_photos (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	tree_id uuid NOT NULL,
	monitoring_record_id uuid NULL,
	uploaded_by uuid NOT NULL,
	photo_url varchar(500) NOT NULL,
	photo_type varchar(50) DEFAULT 'progress'::character varying NULL,
	caption text NULL,
	taken_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT tree_photos_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_tree_photos_monitoring_record_id ON lmsact.tree_photos USING btree (monitoring_record_id);
CREATE INDEX idx_tree_photos_tree_id ON lmsact.tree_photos USING btree (tree_id);


-- lmsact.tree_selection definition

-- Drop table

-- DROP TABLE lmsact.tree_selection;

CREATE TABLE lmsact.tree_selection (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	user_id uuid NOT NULL,
	tree_id uuid NOT NULL,
	selected_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	planted_at timestamptz NULL,
	is_planted bool DEFAULT false NULL,
	status varchar(20) DEFAULT 'active'::character varying NOT NULL,
	notes text NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT tree_selection_pkey PRIMARY KEY (id),
	CONSTRAINT tree_selection_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[]))),
	CONSTRAINT tree_selection_tree_id_key UNIQUE (tree_id),
	CONSTRAINT tree_selection_user_id_key UNIQUE (user_id)
);
CREATE INDEX idx_tree_selection_is_planted ON lmsact.tree_selection USING btree (is_planted);
CREATE INDEX idx_tree_selection_selected_at ON lmsact.tree_selection USING btree (selected_at DESC);
CREATE INDEX idx_tree_selection_status ON lmsact.tree_selection USING btree (status);
CREATE INDEX idx_tree_selection_tree_id ON lmsact.tree_selection USING btree (tree_id);
CREATE INDEX idx_tree_selection_user_id ON lmsact.tree_selection USING btree (user_id);

-- Table Triggers

create trigger trigger_update_tree_selection_updated_at before
update
    on
    lmsact.tree_selection for each row execute function update_tree_selection_updated_at();


-- lmsact.tree_selections definition

-- Drop table

-- DROP TABLE lmsact.tree_selections;

CREATE TABLE lmsact.tree_selections (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	student_id uuid NOT NULL,
	tree_id uuid NOT NULL,
	selection_date timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	planting_instructions text NULL,
	is_planted bool DEFAULT false NULL,
	planting_date timestamptz NULL,
	planting_image_id uuid NULL,
	status varchar(50) DEFAULT 'selected'::character varying NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT tree_selections_pkey PRIMARY KEY (id),
	CONSTRAINT tree_selections_status_check CHECK (((status)::text = ANY (ARRAY[('selected'::character varying)::text, ('planted'::character varying)::text, ('monitoring'::character varying)::text, ('completed'::character varying)::text]))),
	CONSTRAINT tree_selections_student_id_tree_id_key UNIQUE (student_id, tree_id)
);
CREATE INDEX idx_tree_selections_status ON lmsact.tree_selections USING btree (status);
CREATE INDEX idx_tree_selections_student_id ON lmsact.tree_selections USING btree (student_id);
CREATE INDEX idx_tree_selections_tree_id ON lmsact.tree_selections USING btree (tree_id);


-- lmsact.learning_resources definition

-- Drop table

-- DROP TABLE lmsact.learning_resources;

CREATE TABLE lmsact.learning_resources (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	resource_code varchar(50) NOT NULL,
	category varchar(255) NOT NULL,
	start_date date NULL,
	learning_context text NULL,
	latitude numeric(10, 8) NULL,
	longitude numeric(11, 8) NULL,
	assigned_student_id uuid NULL,
	assignment_date date DEFAULT CURRENT_TIMESTAMP NULL,
	status lmsact.resource_status DEFAULT 'available'::resource_status NULL,
	college_id uuid NOT NULL,
	department_id uuid NULL,
	notes text NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT learning_resources_pkey PRIMARY KEY (id),
	CONSTRAINT learning_resources_resource_code_key UNIQUE (resource_code)
);
CREATE INDEX idx_learning_resources_assigned_student_id ON lmsact.learning_resources USING btree (assigned_student_id);
CREATE INDEX idx_learning_resources_college_id ON lmsact.learning_resources USING btree (college_id);
CREATE INDEX idx_learning_resources_status ON lmsact.learning_resources USING btree (status);
CREATE INDEX idx_learning_resources_resource_code ON lmsact.learning_resources USING btree (resource_code);

-- Table Triggers

create trigger update_trees_updated_at before
update
    on
    lmsact.trees for each row execute function update_updated_at_column();


-- lmsact.users definition

-- Drop table

-- DROP TABLE lmsact.users;

CREATE TABLE lmsact.users (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	email varchar(255) NOT NULL,
	password_hash varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" lmsact.user_role NOT NULL,
	phone varchar(20) NULL,
	status lmsact.user_status DEFAULT 'pending'::user_status NULL,
	college_id uuid NULL,
	department_id uuid NULL,
	class_in_charge varchar(50) NULL,
	"class" varchar(50) NULL,
	semester varchar(20) NULL,
	roll_number varchar(50) NULL,
	profile_image_url varchar(500) NULL,
	email_verified bool DEFAULT false NULL,
	last_login timestamptz NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	assigned_class varchar(50) NULL,
	supervisor_id uuid NULL,
	course_id uuid NULL,
	section_id uuid NULL,
	academic_year_id uuid NULL,
	year_of_study varchar(20) NULL,
	phone_verified bool DEFAULT false NULL,
	batch_id uuid NULL,
	aadhar_number varchar(12) NULL,
	date_of_birth date NULL,
	address_line1 text NULL,
	address_line2 text NULL,
	city varchar(100) NULL,
	state varchar(100) NULL,
	district varchar(100) NULL,
	pincode varchar(10) NULL,
	website_url varchar(255) NULL,
	email_domain varchar(100) NULL,
	last_password_reset timestamptz NULL,
	failed_password_reset_attempts int4 DEFAULT 0 NULL,
	last_failed_password_reset timestamptz NULL,
	qualification varchar(200) NULL,
	experience varchar(100) NULL,
	employee_id varchar(50) NULL,
	CONSTRAINT users_email_key UNIQUE (email),
	CONSTRAINT users_employee_id_unique UNIQUE (employee_id),
	CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_users_academic_year_id ON lmsact.users USING btree (academic_year_id);
CREATE INDEX idx_users_batch_id ON lmsact.users USING btree (batch_id);
CREATE INDEX idx_users_college_id ON lmsact.users USING btree (college_id);
CREATE INDEX idx_users_course_id ON lmsact.users USING btree (course_id);
CREATE INDEX idx_users_department_id ON lmsact.users USING btree (department_id);
CREATE INDEX idx_users_email ON lmsact.users USING btree (email);
CREATE INDEX idx_users_employee_id ON lmsact.users USING btree (employee_id) WHERE (employee_id IS NOT NULL);
CREATE INDEX idx_users_experience ON lmsact.users USING btree (experience) WHERE (experience IS NOT NULL);
CREATE INDEX idx_users_failed_password_reset_attempts ON lmsact.users USING btree (failed_password_reset_attempts);
CREATE INDEX idx_users_last_failed_password_reset ON lmsact.users USING btree (last_failed_password_reset);
CREATE INDEX idx_users_last_password_reset ON lmsact.users USING btree (last_password_reset);
CREATE INDEX idx_users_qualification ON lmsact.users USING btree (qualification) WHERE (qualification IS NOT NULL);
CREATE UNIQUE INDEX idx_users_reg_number_unique ON lmsact.users USING btree (roll_number, department_id, batch_id) WHERE ((roll_number IS NOT NULL) AND (department_id IS NOT NULL));
CREATE INDEX idx_users_role ON lmsact.users USING btree (role);
CREATE INDEX idx_users_section_id ON lmsact.users USING btree (section_id);
CREATE INDEX idx_users_status ON lmsact.users USING btree (status);

-- Table Triggers

create trigger update_users_updated_at before
update
    on
    lmsact.users for each row execute function update_updated_at_column();
create trigger trigger_set_email_domain before
insert
    or
update
    of email on
    lmsact.users for each row execute function set_email_domain();


-- lmsact.academic_years foreign keys

ALTER TABLE lmsact.academic_years ADD CONSTRAINT academic_years_course_id_fkey FOREIGN KEY (course_id) REFERENCES lmsact.courses(id) ON DELETE CASCADE;


-- lmsact.approval_workflows foreign keys

ALTER TABLE lmsact.approval_workflows ADD CONSTRAINT approval_workflows_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES lmsact.users(id);
ALTER TABLE lmsact.approval_workflows ADD CONSTRAINT approval_workflows_current_approver_id_fkey FOREIGN KEY (current_approver_id) REFERENCES lmsact.users(id);


-- lmsact.colleges foreign keys

ALTER TABLE lmsact.colleges ADD CONSTRAINT fk_colleges_city FOREIGN KEY (city) REFERENCES lmsact.districts(id);
ALTER TABLE lmsact.colleges ADD CONSTRAINT fk_colleges_principal FOREIGN KEY (principal_id) REFERENCES lmsact.users(id) ON DELETE SET NULL;
ALTER TABLE lmsact.colleges ADD CONSTRAINT fk_colleges_state FOREIGN KEY (state) REFERENCES lmsact.states(id);


-- lmsact.contact_messages foreign keys

ALTER TABLE lmsact.contact_messages ADD CONSTRAINT contact_messages_responded_by_fkey FOREIGN KEY (responded_by) REFERENCES lmsact.users(id) ON DELETE SET NULL;
ALTER TABLE lmsact.contact_messages ADD CONSTRAINT contact_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES lmsact.users(id) ON DELETE SET NULL;


-- lmsact.courses foreign keys

ALTER TABLE lmsact.courses ADD CONSTRAINT courses_college_id_fkey FOREIGN KEY (college_id) REFERENCES lmsact.colleges(id) ON DELETE CASCADE;
ALTER TABLE lmsact.courses ADD CONSTRAINT courses_department_id_fkey FOREIGN KEY (department_id) REFERENCES lmsact.departments(id) ON DELETE CASCADE;


-- lmsact.csv_upload_logs foreign keys

ALTER TABLE lmsact.csv_upload_logs ADD CONSTRAINT csv_upload_logs_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES lmsact.users(id) ON DELETE CASCADE;


-- lmsact.departments foreign keys

ALTER TABLE lmsact.departments ADD CONSTRAINT departments_college_id_fkey FOREIGN KEY (college_id) REFERENCES lmsact.colleges(id) ON DELETE CASCADE;
ALTER TABLE lmsact.departments ADD CONSTRAINT departments_course_id_fkey FOREIGN KEY (course_id) REFERENCES lmsact.courses(id) ON DELETE SET NULL;
ALTER TABLE lmsact.departments ADD CONSTRAINT fk_departments_course FOREIGN KEY (course_id) REFERENCES lmsact.courses(id) ON DELETE SET NULL;
ALTER TABLE lmsact.departments ADD CONSTRAINT fk_departments_hod FOREIGN KEY (hod_id) REFERENCES lmsact.users(id) ON DELETE SET NULL;


-- lmsact.file_uploads foreign keys

ALTER TABLE lmsact.file_uploads ADD CONSTRAINT file_uploads_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES lmsact.users(id);


-- lmsact.guidelines foreign keys

ALTER TABLE lmsact.guidelines ADD CONSTRAINT guidelines_created_by_fkey FOREIGN KEY (created_by) REFERENCES lmsact.users(id);


-- lmsact.invitations foreign keys

ALTER TABLE lmsact.invitations ADD CONSTRAINT invitations_college_id_fkey FOREIGN KEY (college_id) REFERENCES lmsact.colleges(id) ON DELETE CASCADE;
ALTER TABLE lmsact.invitations ADD CONSTRAINT invitations_course_id_fkey FOREIGN KEY (course_id) REFERENCES lmsact.courses(id) ON DELETE SET NULL;
ALTER TABLE lmsact.invitations ADD CONSTRAINT invitations_department_id_fkey FOREIGN KEY (department_id) REFERENCES lmsact.departments(id) ON DELETE CASCADE;
ALTER TABLE lmsact.invitations ADD CONSTRAINT invitations_section_id_fkey FOREIGN KEY (section_id) REFERENCES lmsact.sections(id) ON DELETE SET NULL;
ALTER TABLE lmsact.invitations ADD CONSTRAINT invitations_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES lmsact.users(id) ON DELETE CASCADE;


-- lmsact.notifications foreign keys

ALTER TABLE lmsact.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES lmsact.users(id) ON DELETE CASCADE;


-- lmsact.otp_verifications foreign keys

ALTER TABLE lmsact.otp_verifications ADD CONSTRAINT otp_verifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES lmsact.users(id) ON DELETE CASCADE;


-- lmsact.password_reset_logs foreign keys

ALTER TABLE lmsact.password_reset_logs ADD CONSTRAINT password_reset_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES lmsact.users(id) ON DELETE CASCADE;


-- lmsact.registration_requests foreign keys

ALTER TABLE lmsact.registration_requests ADD CONSTRAINT registration_requests_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES lmsact.academic_years(id) ON DELETE SET NULL;
ALTER TABLE lmsact.registration_requests ADD CONSTRAINT registration_requests_assigned_approver_id_fkey FOREIGN KEY (assigned_approver_id) REFERENCES lmsact.users(id);
ALTER TABLE lmsact.registration_requests ADD CONSTRAINT registration_requests_college_id_fkey FOREIGN KEY (college_id) REFERENCES lmsact.colleges(id) ON DELETE CASCADE;
ALTER TABLE lmsact.registration_requests ADD CONSTRAINT registration_requests_course_id_fkey FOREIGN KEY (course_id) REFERENCES lmsact.courses(id) ON DELETE SET NULL;
ALTER TABLE lmsact.registration_requests ADD CONSTRAINT registration_requests_department_id_fkey FOREIGN KEY (department_id) REFERENCES lmsact.departments(id) ON DELETE CASCADE;
ALTER TABLE lmsact.registration_requests ADD CONSTRAINT registration_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES lmsact.users(id) ON DELETE SET NULL;
ALTER TABLE lmsact.registration_requests ADD CONSTRAINT registration_requests_section_id_fkey FOREIGN KEY (section_id) REFERENCES lmsact.sections(id) ON DELETE SET NULL;


-- lmsact.resources foreign keys

ALTER TABLE lmsact.resources ADD CONSTRAINT resources_created_by_fkey FOREIGN KEY (created_by) REFERENCES lmsact.users(id);


-- lmsact.sections foreign keys

ALTER TABLE lmsact.sections ADD CONSTRAINT sections_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES lmsact.academic_years(id) ON DELETE CASCADE;
ALTER TABLE lmsact.sections ADD CONSTRAINT sections_class_in_charge_id_fkey FOREIGN KEY (class_in_charge_id) REFERENCES lmsact.users(id) ON DELETE SET NULL;
ALTER TABLE lmsact.sections ADD CONSTRAINT sections_course_id_fkey FOREIGN KEY (course_id) REFERENCES lmsact.courses(id) ON DELETE CASCADE;
ALTER TABLE lmsact.sections ADD CONSTRAINT sections_department_id_fkey FOREIGN KEY (department_id) REFERENCES lmsact.departments(id) ON DELETE CASCADE;


-- lmsact.student_batches foreign keys

ALTER TABLE lmsact.student_batches ADD CONSTRAINT student_batches_department_id_fkey FOREIGN KEY (department_id) REFERENCES lmsact.departments(id) ON DELETE CASCADE;


-- lmsact.tree_images foreign keys

ALTER TABLE lmsact.tree_images ADD CONSTRAINT tree_images_student_id_fkey FOREIGN KEY (student_id) REFERENCES lmsact.users(id) ON DELETE CASCADE;
ALTER TABLE lmsact.tree_images ADD CONSTRAINT tree_images_tree_id_fkey FOREIGN KEY (tree_id) REFERENCES lmsact.trees(id) ON DELETE CASCADE;


-- lmsact.tree_monitoring foreign keys

ALTER TABLE lmsact.tree_monitoring ADD CONSTRAINT tree_monitoring_tree_id_fkey FOREIGN KEY (tree_id) REFERENCES lmsact.trees(id) ON DELETE CASCADE;
ALTER TABLE lmsact.tree_monitoring ADD CONSTRAINT tree_monitoring_user_id_fkey FOREIGN KEY (user_id) REFERENCES lmsact.users(id) ON DELETE CASCADE;
ALTER TABLE lmsact.tree_monitoring ADD CONSTRAINT tree_monitoring_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES lmsact.users(id) ON DELETE SET NULL;


-- lmsact.tree_monitoring_records foreign keys

ALTER TABLE lmsact.tree_monitoring_records ADD CONSTRAINT tree_monitoring_records_student_id_fkey FOREIGN KEY (student_id) REFERENCES lmsact.users(id) ON DELETE CASCADE;
ALTER TABLE lmsact.tree_monitoring_records ADD CONSTRAINT tree_monitoring_records_tree_id_fkey FOREIGN KEY (tree_id) REFERENCES lmsact.trees(id) ON DELETE CASCADE;
ALTER TABLE lmsact.tree_monitoring_records ADD CONSTRAINT tree_monitoring_records_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES lmsact.users(id) ON DELETE SET NULL;


-- lmsact.tree_photos foreign keys

ALTER TABLE lmsact.tree_photos ADD CONSTRAINT tree_photos_monitoring_record_id_fkey FOREIGN KEY (monitoring_record_id) REFERENCES lmsact.tree_monitoring_records(id) ON DELETE CASCADE;
ALTER TABLE lmsact.tree_photos ADD CONSTRAINT tree_photos_tree_id_fkey FOREIGN KEY (tree_id) REFERENCES lmsact.trees(id) ON DELETE CASCADE;
ALTER TABLE lmsact.tree_photos ADD CONSTRAINT tree_photos_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES lmsact.users(id) ON DELETE CASCADE;


-- lmsact.tree_selection foreign keys

ALTER TABLE lmsact.tree_selection ADD CONSTRAINT tree_selection_tree_id_fkey FOREIGN KEY (tree_id) REFERENCES lmsact.trees(id) ON DELETE CASCADE;
ALTER TABLE lmsact.tree_selection ADD CONSTRAINT tree_selection_user_id_fkey FOREIGN KEY (user_id) REFERENCES lmsact.users(id) ON DELETE CASCADE;


-- lmsact.tree_selections foreign keys

ALTER TABLE lmsact.tree_selections ADD CONSTRAINT tree_selections_planting_image_id_fkey FOREIGN KEY (planting_image_id) REFERENCES lmsact.tree_images(id);
ALTER TABLE lmsact.tree_selections ADD CONSTRAINT tree_selections_student_id_fkey FOREIGN KEY (student_id) REFERENCES lmsact.users(id) ON DELETE CASCADE;
ALTER TABLE lmsact.tree_selections ADD CONSTRAINT tree_selections_tree_id_fkey FOREIGN KEY (tree_id) REFERENCES lmsact.trees(id) ON DELETE CASCADE;


-- lmsact.trees foreign keys

ALTER TABLE lmsact.trees ADD CONSTRAINT trees_assigned_student_id_fkey FOREIGN KEY (assigned_student_id) REFERENCES lmsact.users(id) ON DELETE SET NULL;
ALTER TABLE lmsact.trees ADD CONSTRAINT trees_college_id_fkey FOREIGN KEY (college_id) REFERENCES lmsact.colleges(id) ON DELETE CASCADE;
ALTER TABLE lmsact.trees ADD CONSTRAINT trees_department_id_fkey FOREIGN KEY (department_id) REFERENCES lmsact.departments(id) ON DELETE CASCADE;


-- lmsact.users foreign keys

ALTER TABLE lmsact.users ADD CONSTRAINT fk_users_academic_year FOREIGN KEY (academic_year_id) REFERENCES lmsact.academic_years(id) ON DELETE SET NULL;
ALTER TABLE lmsact.users ADD CONSTRAINT fk_users_course FOREIGN KEY (course_id) REFERENCES lmsact.courses(id) ON DELETE SET NULL;
ALTER TABLE lmsact.users ADD CONSTRAINT fk_users_section FOREIGN KEY (section_id) REFERENCES lmsact.sections(id) ON DELETE SET NULL;
ALTER TABLE lmsact.users ADD CONSTRAINT users_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES lmsact.academic_years(id) ON DELETE SET NULL;
ALTER TABLE lmsact.users ADD CONSTRAINT users_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES lmsact.student_batches(id) ON DELETE SET NULL;
ALTER TABLE lmsact.users ADD CONSTRAINT users_college_id_fkey FOREIGN KEY (college_id) REFERENCES lmsact.colleges(id) ON DELETE SET NULL;
ALTER TABLE lmsact.users ADD CONSTRAINT users_course_id_fkey FOREIGN KEY (course_id) REFERENCES lmsact.courses(id) ON DELETE SET NULL;
ALTER TABLE lmsact.users ADD CONSTRAINT users_department_id_fkey FOREIGN KEY (department_id) REFERENCES lmsact.departments(id) ON DELETE SET NULL;
ALTER TABLE lmsact.users ADD CONSTRAINT users_section_id_fkey FOREIGN KEY (section_id) REFERENCES lmsact.sections(id) ON DELETE SET NULL;
ALTER TABLE lmsact.users ADD CONSTRAINT users_supervisor_id_fkey FOREIGN KEY (supervisor_id) REFERENCES lmsact.users(id);


-- lmsact.invitation_details source

CREATE OR REPLACE VIEW lmsact.invitation_details
AS SELECT i.id,
    i.email,
    i.role,
    i.status,
    i.sent_by,
    i.sent_at,
    i.accepted_at,
    i.rejected_at,
    i.expires_at,
    i.college_id,
    i.department_id,
    i.invitation_token,
    i.created_at,
    i.name,
    i.phone,
    i.year_of_study,
    i.section,
    i.roll_number,
    i.designation,
    i.qualification,
    i.experience,
    u.name AS sent_by_name,
    u.role AS sender_role,
    c.name AS college_name,
    d.name AS department_name,
    d.code AS department_code,
        CASE
            WHEN i.role = 'student'::user_role THEN concat('Year ', COALESCE(i.year_of_study::text, '1'::text), ' - Section ', COALESCE(i.section, 'A'::character varying), ' (', COALESCE(i.roll_number, 'TBD'::character varying), ')')
            WHEN i.role = ANY (ARRAY['staff'::user_role, 'hod'::user_role]) THEN COALESCE(i.designation, 'Staff Member'::character varying)::text
            WHEN i.role = 'principal'::user_role THEN 'Principal'::text
            ELSE i.role::text
        END AS role_description,
        CASE
            WHEN i.expires_at < now() THEN 'expired'::invitation_status
            WHEN i.status = 'pending'::invitation_status AND i.expires_at > now() THEN 'pending'::invitation_status
            ELSE i.status
        END AS current_status
   FROM invitations i
     LEFT JOIN users u ON i.sent_by = u.id
     LEFT JOIN colleges c ON i.college_id = c.id
     LEFT JOIN departments d ON i.department_id = d.id;


-- lmsact.v_courses_with_departments source

CREATE OR REPLACE VIEW lmsact.v_courses_with_departments
AS SELECT c.id,
    c.name,
    c.code,
    c.type,
    c.duration_years,
    c.college_id,
    c.department_id,
    c.is_active,
    c.description,
    d.name AS department_name,
    d.code AS department_code,
    col.name AS college_name
   FROM courses c
     LEFT JOIN departments d ON c.department_id = d.id
     LEFT JOIN colleges col ON c.college_id = col.id
  WHERE c.is_active = true;


-- lmsact.v_sections_with_details source

CREATE OR REPLACE VIEW lmsact.v_sections_with_details
AS SELECT s.id,
    s.name,
    s.course_id,
    s.department_id,
    s.academic_year_id,
    s.max_students,
    s.current_students,
    s.status,
    s.academic_session,
    c.name AS course_name,
    c.code AS course_code,
    d.name AS department_name,
    d.code AS department_code,
    ay.year_name,
    ay.year_number,
    col.name AS college_name
   FROM sections s
     JOIN courses c ON s.course_id = c.id
     JOIN departments d ON s.department_id = d.id
     JOIN academic_years ay ON s.academic_year_id = ay.id
     JOIN colleges col ON c.college_id = col.id
  WHERE s.status = 'active'::section_status AND c.is_active = true;



-- DROP FUNCTION lmsact.extract_email_domain(text);

CREATE OR REPLACE FUNCTION lmsact.extract_email_domain(email_address text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN LOWER(SPLIT_PART(email_address, '@', 2));
END;
$function$
;

-- DROP FUNCTION lmsact.get_courses_by_college(uuid);

CREATE OR REPLACE FUNCTION lmsact.get_courses_by_college(college_uuid uuid)
 RETURNS TABLE(id uuid, name character varying, code character varying, type course_type, duration_years integer, department_id uuid, department_name character varying, department_code character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.code,
        c.type,
        c.duration_years,
        c.department_id,
        d.name as department_name,
        d.code as department_code
    FROM courses c
    LEFT JOIN departments d ON c.department_id = d.id
    WHERE c.college_id = college_uuid 
    AND c.is_active = true
    ORDER BY c.name ASC;
END;
$function$
;

-- DROP FUNCTION lmsact.get_departments_by_course(uuid);

CREATE OR REPLACE FUNCTION lmsact.get_departments_by_course(course_uuid uuid)
 RETURNS TABLE(id uuid, name character varying, code character varying, college_id uuid, hod_id uuid, total_students integer, total_staff integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- First try to get departments directly linked to the course
    RETURN QUERY
    SELECT 
        d.id,
        d.name,
        d.code,
        d.college_id,
        d.hod_id,
        d.total_students,
        d.total_staff
    FROM departments d
    JOIN courses c ON d.id = c.department_id
    WHERE c.id = course_uuid
    AND c.is_active = true;
    
    -- If no results found, try alternative approach
    -- Get departments from the same college as the course
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            d.id,
            d.name,
            d.code,
            d.college_id,
            d.hod_id,
            d.total_students,
            d.total_staff
        FROM departments d
        JOIN courses c ON d.college_id = c.college_id
        WHERE c.id = course_uuid
        AND c.is_active = true
        ORDER BY d.name ASC;
    END IF;
END;
$function$
;

-- DROP FUNCTION lmsact.get_departments_by_course_college(uuid);

CREATE OR REPLACE FUNCTION lmsact.get_departments_by_course_college(course_uuid uuid)
 RETURNS TABLE(id uuid, name character varying, code character varying, college_id uuid, hod_id uuid, total_students integer, total_staff integer, college_name character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.name,
        d.code,
        d.college_id,
        d.hod_id,
        d.total_students,
        d.total_staff,
        col.name as college_name
    FROM departments d
    JOIN courses c ON d.college_id = c.college_id
    JOIN colleges col ON d.college_id = col.id
    WHERE c.id = course_uuid
    AND c.is_active = true
    AND col.status = 'active'
    ORDER BY d.name ASC;
END;
$function$
;

-- DROP FUNCTION lmsact.get_sections_by_course_and_year(uuid, varchar);

CREATE OR REPLACE FUNCTION lmsact.get_sections_by_course_and_year(course_uuid uuid, year_name_param character varying)
 RETURNS TABLE(id uuid, name character varying, course_id uuid, department_id uuid, academic_year_id uuid, max_students integer, current_students integer, academic_session character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.course_id,
        s.department_id,
        s.academic_year_id,
        s.max_students,
        s.current_students,
        s.academic_session
    FROM sections s
    JOIN academic_years ay ON s.academic_year_id = ay.id
    WHERE s.course_id = course_uuid 
    AND ay.year_name = year_name_param
    AND s.status = 'active'
    ORDER BY s.name ASC;
END;
$function$
;

-- DROP FUNCTION lmsact.set_email_domain();

CREATE OR REPLACE FUNCTION lmsact.set_email_domain()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.email_domain = extract_email_domain(NEW.email);
  RETURN NEW;
END;
$function$
;

-- DROP FUNCTION lmsact.sync_all_section_student_counts();

CREATE OR REPLACE FUNCTION lmsact.sync_all_section_student_counts()
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
        DECLARE
            updated_count INTEGER := 0;
        BEGIN
            UPDATE sections
            SET current_students = (
                SELECT COUNT(*)
                FROM users
                WHERE users.section_id = sections.id
                  AND users.role = 'student'
                  AND users.status = 'active'
            );

            GET DIAGNOSTICS updated_count = ROW_COUNT;

            RETURN updated_count;
        END;
        $function$
;

-- DROP FUNCTION lmsact.update_contact_messages_updated_at();

CREATE OR REPLACE FUNCTION lmsact.update_contact_messages_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$
;

-- DROP FUNCTION lmsact.update_otp_verifications_updated_at();

CREATE OR REPLACE FUNCTION lmsact.update_otp_verifications_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$function$
;

-- DROP FUNCTION lmsact.update_tree_monitoring_updated_at();

CREATE OR REPLACE FUNCTION lmsact.update_tree_monitoring_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$
;

-- DROP FUNCTION lmsact.update_tree_selection_updated_at();

CREATE OR REPLACE FUNCTION lmsact.update_tree_selection_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$
;

-- DROP FUNCTION lmsact.update_updated_at_column();

CREATE OR REPLACE FUNCTION lmsact.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$
;

-- DROP FUNCTION lmsact.uuid_generate_v1();

CREATE OR REPLACE FUNCTION lmsact.uuid_generate_v1()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v1$function$
;

-- DROP FUNCTION lmsact.uuid_generate_v1mc();

CREATE OR REPLACE FUNCTION lmsact.uuid_generate_v1mc()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v1mc$function$
;

-- DROP FUNCTION lmsact.uuid_generate_v3(uuid, text);

CREATE OR REPLACE FUNCTION lmsact.uuid_generate_v3(namespace uuid, name text)
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v3$function$
;

-- DROP FUNCTION lmsact.uuid_generate_v4();

CREATE OR REPLACE FUNCTION lmsact.uuid_generate_v4()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v4$function$
;

-- DROP FUNCTION lmsact.uuid_generate_v5(uuid, text);

CREATE OR REPLACE FUNCTION lmsact.uuid_generate_v5(namespace uuid, name text)
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v5$function$
;

-- DROP FUNCTION lmsact.uuid_nil();

CREATE OR REPLACE FUNCTION lmsact.uuid_nil()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_nil$function$
;

-- DROP FUNCTION lmsact.uuid_ns_dns();

CREATE OR REPLACE FUNCTION lmsact.uuid_ns_dns()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_dns$function$
;

-- DROP FUNCTION lmsact.uuid_ns_oid();

CREATE OR REPLACE FUNCTION lmsact.uuid_ns_oid()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_oid$function$
;

-- DROP FUNCTION lmsact.uuid_ns_url();

CREATE OR REPLACE FUNCTION lmsact.uuid_ns_url()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_url$function$
;

-- DROP FUNCTION lmsact.uuid_ns_x500();

CREATE OR REPLACE FUNCTION lmsact.uuid_ns_x500()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_x500$function$
;

-- DROP FUNCTION lmsact.validate_invitation_data();

CREATE OR REPLACE FUNCTION lmsact.validate_invitation_data()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Ensure name is always provided
  IF NEW.name IS NULL OR LENGTH(TRIM(NEW.name)) = 0 THEN
    NEW.name := SPLIT_PART(NEW.email, '@', 1);
  END IF;
  
  -- Validate student-specific fields
  IF NEW.role = 'student' THEN
    IF NEW.year_of_study IS NULL THEN
      NEW.year_of_study := 1; -- Default to first year
    END IF;
    
    IF NEW.year_of_study NOT BETWEEN 1 AND 4 THEN
      RAISE EXCEPTION '%', NEW.year_of_study;
    END IF;
    
    IF NEW.section IS NULL OR LENGTH(TRIM(NEW.section)) = 0 THEN
      NEW.section := 'A'; -- Default section
    END IF;
    
    IF NEW.roll_number IS NULL OR LENGTH(TRIM(NEW.roll_number)) = 0 THEN
      NEW.roll_number := UPPER(SUBSTRING(NEW.email FROM 1 FOR 10));
    END IF;
    
    IF NEW.department_id IS NULL THEN
      RAISE EXCEPTION 'Department is required for student invitations';
    END IF;
  END IF;
  
  -- Validate staff-specific fields
  IF NEW.role IN ('staff', 'hod') THEN
    IF NEW.department_id IS NULL THEN
      RAISE EXCEPTION 'Department is required for staff invitations';
    END IF;
    
    IF NEW.designation IS NULL OR LENGTH(TRIM(NEW.designation)) = 0 THEN
      NEW.designation := CASE 
        WHEN NEW.role = 'hod' THEN 'Head of Department'
        ELSE 'Faculty'
      END;
    END IF;
  END IF;
  
  -- Validate principal-specific fields
  IF NEW.role = 'principal' THEN
    IF NEW.college_id IS NULL THEN
      RAISE EXCEPTION 'College is required for principal invitations';
    END IF;
  END IF;
  
  -- Validate experience field
  IF NEW.experience IS NOT NULL AND (NEW.experience < 0 OR NEW.experience > 50) THEN
    RAISE EXCEPTION 'Experience must be between 0 and 50 years';
  END IF;
  
  RETURN NEW;
END;
$function$
;