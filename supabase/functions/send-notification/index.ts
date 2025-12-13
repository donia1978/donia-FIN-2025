import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  user_id: string;
  title: string;
  message: string;
  type?: string;
  channels?: ('push' | 'email' | 'sms')[];
  data?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: NotificationPayload = await req.json();
    const { user_id, title, message, type = 'info', channels = ['push'], data } = payload;

    if (!user_id || !title || !message) {
      throw new Error('user_id, title, and message are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results: Record<string, any> = {};

    // 1. Store notification in database (always)
    const { data: notification, error: dbError } = await supabase
      .from('notifications')
      .insert({
        user_id,
        title,
        message,
        type,
        is_read: false,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error storing notification:', dbError);
      results.database = { success: false, error: dbError.message };
    } else {
      results.database = { success: true, id: notification.id };
    }

    // 2. Get user preferences
    const { data: profile } = await supabase
      .from('profiles')
      .select('notification_email, notification_push, notification_sms, email, phone')
      .eq('id', user_id)
      .single();

    // 3. Send via requested channels
    for (const channel of channels) {
      switch (channel) {
        case 'email':
          if (profile?.notification_email && profile?.email) {
            const resendKey = Deno.env.get('RESEND_API_KEY');
            if (resendKey) {
              try {
                const emailRes = await fetch('https://api.resend.com/emails', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${resendKey}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    from: 'DONIA Medical <notifications@donia.app>',
                    to: [profile.email],
                    subject: title,
                    html: `
                      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #1a1a2e;">${title}</h2>
                        <p style="color: #4a4a4a; line-height: 1.6;">${message}</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                        <p style="color: #888; font-size: 12px;">DONIA Medical Platform</p>
                      </div>
                    `,
                  }),
                });
                results.email = { success: emailRes.ok };
              } catch (e) {
                results.email = { success: false, error: 'Email service error' };
              }
            } else {
              results.email = { success: false, error: 'RESEND_API_KEY not configured' };
            }
          }
          break;

        case 'sms':
          if (profile?.notification_sms && profile?.phone) {
            const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
            const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
            const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');
            
            if (twilioSid && twilioToken && twilioPhone) {
              try {
                const smsRes = await fetch(
                  `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
                  {
                    method: 'POST',
                    headers: {
                      'Authorization': `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
                      'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                      To: profile.phone,
                      From: twilioPhone,
                      Body: `${title}\n${message}`,
                    }),
                  }
                );
                results.sms = { success: smsRes.ok };
              } catch (e) {
                results.sms = { success: false, error: 'SMS service error' };
              }
            } else {
              results.sms = { success: false, error: 'Twilio not configured' };
            }
          }
          break;

        case 'push':
          // Push notifications are handled client-side via service workers
          results.push = { success: true, note: 'Stored in database, client will fetch' };
          break;
      }
    }

    console.log('Notification sent:', { user_id, title, channels, results });

    return new Response(JSON.stringify({ 
      success: true, 
      results,
      notification_id: notification?.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Notification error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});