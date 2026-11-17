import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient, QueryResultRow } from 'pg';
export type Tx = PoolClient;
@Injectable()
export class DbService implements OnModuleDestroy {
  private pool = new Pool({connectionString: process.env.DATABASE_URL, options: '-c search_path=peca_aqui,public', max: 12, connectionTimeoutMillis: 5000});
  async q<T extends QueryResultRow=any>(sql: string, params: unknown[] = [], client?: Tx): Promise<T[]> {
    const response = await (client ?? this.pool).query<T>(sql, params);
    return response.rows;
  }
  async one<T extends QueryResultRow=any>(sql: string, params: unknown[] = [], client?: Tx): Promise<T | null> {
    const rows = await this.q<T>(sql,params,client); return rows[0] ?? null;
  }
  async tx<T>(actorId: number|null, run: (client: Tx)=>Promise<T>): Promise<T> {
    const c=await this.pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SELECT set_config('app.actor_id',$1,true)",[actorId == null ? '' : String(actorId)]);
      const value=await run(c); await c.query('COMMIT'); return value;
    } catch(e) { await c.query('ROLLBACK'); throw e; }
    finally {c.release();}
  }
  async onModuleDestroy(){await this.pool.end();}
}
