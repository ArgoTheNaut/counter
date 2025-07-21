import { Client } from 'pg';
import { MINUTES } from './constants';

export class Database {
    static db: Database;
    client: Client;
    ready: Boolean;
    readyPromise: Promise<Boolean>;

    static async initialize() {
        if (Database.db) return;

        console.log("Initializing Database");
        Database.db ??= new Database();
        await Database.db.readyPromise; // don't continue until the DB connection is established
        console.log("Initialized Database");
    }

    constructor() {
        let config = JSON.parse(fs.readFileSync("db_config.json").toString());
        this.ready = false;
        this.client = new Client(config);

        // constructors must not be async
        this.readyPromise = new Promise((res, rej) => {
            this.client.connect((err) => {
                if (err) {
                    console.log("Encountered an error in connecting", err);
                    res(this.ready);
                    return;
                }
                this.ready = true;
                console.log("Connection to database established.");
                res(this.ready);
            });
        });
    }

    async query(queryText, args = []) {
        args = args.map(a => (a === undefined) ? null : a); // cast undefined to null
        console.log("Executing query:", queryText, args);
        return await this.client.query(queryText, args);
    }

    static async getClicks(queryValues, username: string) {
        console.log("Incoming query values:", queryValues);
        let startTime = Number(queryValues['start']) || (new Date(Date.now() - new Date().getTimezoneOffset() * MINUTES)).toISOString().split("T")[0] + " 00:00:00";
        let endTime = Number(queryValues['end']) || Date.now();

        let query = [
            "SELECT user_submitted_time, server_submission_time, category",
            "FROM counter",
            "WHERE ",
            "    user_submitted_time < $2 AND user_submitted_time > $1 ",
            "    AND username = $3",
            "    AND deleted = false;",
        ].join(" ");
        let args = [
            new Date(startTime),
            new Date(endTime),
            username,
        ];
        // console.log("Converted", startTime, endTime, "to", ...args);
        return await Database.db.query(query, args);
    }

    static async recordClick(
        username: string,
        ip: string,
        time: number | string | Date,
        category: string,
    ) {
        let date = new Date(time);
        let query = [
            "INSERT INTO",
            "counter (username, ip, user_submitted_time, category) ",
            "VALUES ($1, $2, $3, $4);",
        ].join("\n");
        let args = [username, ip, date, category.toLowerCase()];
        await Database.db.query(query, args);
    }

    static async undoClick(category: string, username: string) {
        let query = [
            "WITH newest_row AS (",
            "    SELECT server_submission_time",
            "    FROM counter",
            "    WHERE ",
            "        deleted = false AND",
            "        category = $1 AND",
            "        username = $2 AND",
            "        user_submitted_time >= CURRENT_DATE",
            "    ORDER BY server_submission_time DESC",
            "    LIMIT 1",
            ")",
            "UPDATE counter",
            "    SET deleted = true",
            "    WHERE server_submission_time IN (SELECT server_submission_time FROM newest_row);",
        ].join("\n");
        let args = [category.toLowerCase(), username];
        await Database.db.query(query, args);
    }
}

Database.initialize();
