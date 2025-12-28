import React, { useEffect, useState } from "react";
import { listMyNotifications, NotificationItem } from "../../lib/notificationsService";

export default function NotificationsPage(){
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try{
        setErr(null);
        const data = await listMyNotifications();
        setItems(data);
      }catch(e:any){
        setErr(e?.message || String(e));
      }
    })();
  }, []);

  return (
    <div style={{padding:16}}>
      <h2 style={{fontSize:22,fontWeight:800,margin:0}}>Notifications</h2>
      {err ? <div style={{color:"#b91c1c",marginTop:10}}>{err}</div> : null}
      <div style={{marginTop:12,display:"grid",gap:10}}>
        {items.map(n => (
          <div key={n.id} style={{border:"1px solid #e5e5e5",borderRadius:12,padding:12}}>
            <div style={{fontWeight:800}}>{n.title}</div>
            {n.body ? <div style={{opacity:.85,marginTop:6}}>{n.body}</div> : null}
            <div style={{fontSize:12,opacity:.7,marginTop:8}}>
              {new Date(n.created_at).toLocaleString()} â€¢ {n.level}
            </div>
          </div>
        ))}
        {items.length===0 ? <div style={{opacity:.8}}>Aucune notification</div> : null}
      </div>
    </div>
  );
}