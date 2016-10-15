--
-- PostgreSQL database dump
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


SET search_path = public, pg_catalog;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: journal_entries; Type: TABLE; Schema: public; Owner: strongcode-dev; Tablespace: 
--

CREATE TABLE journal_entries (
    id integer NOT NULL,
    text text,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    user_id integer
);


ALTER TABLE public.journal_entries OWNER TO "strongcode-dev";

--
-- Name: journal_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: strongcode-dev
--

CREATE SEQUENCE journal_entries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.journal_entries_id_seq OWNER TO "strongcode-dev";

--
-- Name: journal_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: strongcode-dev
--

ALTER SEQUENCE journal_entries_id_seq OWNED BY journal_entries.id;


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: strongcode-dev; Tablespace: 
--

CREATE TABLE schema_migrations (
    version character varying NOT NULL
);


ALTER TABLE public.schema_migrations OWNER TO "strongcode-dev";

--
-- Name: users; Type: TABLE; Schema: public; Owner: strongcode-dev; Tablespace: 
--

CREATE TABLE users (
    id integer NOT NULL,
    email character varying DEFAULT ''::character varying NOT NULL,
    encrypted_password character varying DEFAULT ''::character varying NOT NULL,
    reset_password_token character varying,
    reset_password_sent_at timestamp without time zone,
    remember_created_at timestamp without time zone,
    sign_in_count integer DEFAULT 0 NOT NULL,
    current_sign_in_at timestamp without time zone,
    last_sign_in_at timestamp without time zone,
    current_sign_in_ip inet,
    last_sign_in_ip inet,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    api_key character varying
);


ALTER TABLE public.users OWNER TO "strongcode-dev";

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: strongcode-dev
--

CREATE SEQUENCE users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO "strongcode-dev";

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: strongcode-dev
--

ALTER SEQUENCE users_id_seq OWNED BY users.id;


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: strongcode-dev
--

ALTER TABLE ONLY journal_entries ALTER COLUMN id SET DEFAULT nextval('journal_entries_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: strongcode-dev
--

ALTER TABLE ONLY users ALTER COLUMN id SET DEFAULT nextval('users_id_seq'::regclass);


--
-- Data for Name: journal_entries; Type: TABLE DATA; Schema: public; Owner: strongcode-dev
--

COPY journal_entries (id, text, created_at, updated_at, user_id) FROM stdin;
14	I don't think there's any issue in running this rails service in dev mode, but I really dont give enough of a fuck to set up all the prod stuff so I guess we'll find out	2016-10-14 00:16:35.640221	2016-10-14 00:16:35.640221	1
15	very irritable for some reason, but fingers are moving fast and I do feel in the zone so to speak. Will check blood glucose	2016-10-14 03:33:19.343367	2016-10-14 03:33:19.343367	1
16	just realized I will have to figure out a way of escaping quotes in an easy way when making a note from the command line	2016-10-14 03:33:51.50712	2016-10-14 03:33:51.50712	1
17	fuck timezones	2016-10-14 07:02:27.937841	2016-10-14 07:02:27.937841	1
18	fuzzy headed this morning but overall good. Woke up with low-200s blood glucose and took 100mg modafinil. The rain is nice	2016-10-14 17:22:33.005083	2016-10-14 17:22:33.005083	1
\.


--
-- Name: journal_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: strongcode-dev
--

SELECT pg_catalog.setval('journal_entries_id_seq', 18, true);


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: public; Owner: strongcode-dev
--

COPY schema_migrations (version) FROM stdin;
20161010185425
20161010192341
20161010195245
20161013170947
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: strongcode-dev
--

COPY users (id, email, encrypted_password, reset_password_token, reset_password_sent_at, remember_created_at, sign_in_count, current_sign_in_at, last_sign_in_at, current_sign_in_ip, last_sign_in_ip, created_at, updated_at, api_key) FROM stdin;
1	colin@strongco.de	$2a$10$P9aWHES00Xe3p0qf5UL6ZuTy1MVA93o8qJbkDPHMJK5qoKG5gK55W	\N	\N	\N	7	2016-10-14 03:31:58.352677	2016-10-11 17:37:26.171883	127.0.0.1	127.0.0.1	2016-10-10 20:54:41.269731	2016-10-14 03:31:58.356149	xvvU11Sw84HzwD7nZ6kLWAtt
\.


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: strongcode-dev
--

SELECT pg_catalog.setval('users_id_seq', 1, true);


--
-- Name: journal_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: strongcode-dev; Tablespace: 
--

ALTER TABLE ONLY journal_entries
    ADD CONSTRAINT journal_entries_pkey PRIMARY KEY (id);


--
-- Name: users_pkey; Type: CONSTRAINT; Schema: public; Owner: strongcode-dev; Tablespace: 
--

ALTER TABLE ONLY users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: index_users_on_email; Type: INDEX; Schema: public; Owner: strongcode-dev; Tablespace: 
--

CREATE UNIQUE INDEX index_users_on_email ON users USING btree (email);


--
-- Name: index_users_on_reset_password_token; Type: INDEX; Schema: public; Owner: strongcode-dev; Tablespace: 
--

CREATE UNIQUE INDEX index_users_on_reset_password_token ON users USING btree (reset_password_token);


--
-- Name: unique_schema_migrations; Type: INDEX; Schema: public; Owner: strongcode-dev; Tablespace: 
--

CREATE UNIQUE INDEX unique_schema_migrations ON schema_migrations USING btree (version);


--
-- Name: fk_rails_4ea185c6f0; Type: FK CONSTRAINT; Schema: public; Owner: strongcode-dev
--

ALTER TABLE ONLY journal_entries
    ADD CONSTRAINT fk_rails_4ea185c6f0 FOREIGN KEY (user_id) REFERENCES users(id);


--
-- Name: public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM postgres;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- PostgreSQL database dump complete
--

