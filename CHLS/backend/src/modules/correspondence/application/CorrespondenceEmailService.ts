import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

export interface SmtpConfig {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
}

export class CorrespondenceEmailService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Obtiene la configuración SMTP guardada en BD o fallback a variables de entorno
   */
  public async getSmtpConfig(): Promise<SmtpConfig> {
    try {
      const configFilePath = path.join(process.cwd(), 'data', 'correspondence_settings.json');
      if (fs.existsSync(configFilePath)) {
        const val = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
        if (val && val.smtp) {
          return {
            enabled: !!val.smtp.enabled,
            host: val.smtp.host || process.env.SMTP_HOST || 'smtp.gmail.com',
            port: Number(val.smtp.port) || Number(process.env.SMTP_PORT) || 587,
            secure: val.smtp.secure !== undefined ? !!val.smtp.secure : false,
            user: val.smtp.user || process.env.SMTP_USER || '',
            pass: val.smtp.pass || process.env.SMTP_PASS || '',
            fromEmail: val.smtp.fromEmail || val.smtp.user || process.env.SMTP_FROM || 'correspondencia@chls.bo',
            fromName: val.smtp.fromName || 'Club Hípico Los Sargentos — Correspondencia',
          };
        }
      }
    } catch (err) {
      console.error('[CorrespondenceEmailService] Error al leer configuración SMTP:', err);
    }

    return {
      enabled: false,
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      fromEmail: process.env.SMTP_FROM || 'correspondencia@chls.bo',
      fromName: 'Club Hípico Los Sargentos — Correspondencia',
    };
  }

  /**
   * Crea un transportador nodemailer con los parámetros especificados
   */
  private createTransporter(config: SmtpConfig) {
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465 || config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  /**
   * Envía un correo de prueba para verificar conectividad y credenciales SMTP
   */
  public async sendTestEmail(testRecipient: string, customConfig?: SmtpConfig): Promise<{ success: boolean; message: string }> {
    try {
      const config = customConfig || (await this.getSmtpConfig());

      if (!config.user || !config.pass) {
        return { success: false, message: 'Usuario o contraseña SMTP no configurados.' };
      }

      const transporter = this.createTransporter(config);

      // Verificar conexión
      await transporter.verify();

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
            .header { background: linear-gradient(135deg, #064e3b 0%, #047857 100%); padding: 30px 20px; text-align: center; color: #ffffff; }
            .logo-text { font-size: 20px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #fbbf24; margin: 0; }
            .logo-sub { font-size: 13px; font-weight: 700; letter-spacing: 1px; color: #d1fae5; text-transform: uppercase; margin-top: 4px; }
            .content { padding: 30px; color: #1e293b; line-height: 1.6; }
            .badge-test { display: inline-block; background: #dcfce7; color: #166534; font-weight: 800; font-size: 11px; padding: 6px 14px; border-radius: 20px; text-transform: uppercase; margin-bottom: 15px; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo-text">CLUB HÍPICO LOS SARGENTOS</div>
              <div class="logo-sub">Sistema de Correspondencia & Notificaciones</div>
            </div>
            <div class="content">
              <div class="badge-test">✓ Conexión SMTP Exitosa</div>
              <h2 style="margin-top: 0; color: #0f172a;">Prueba de Conexión de Correo</h2>
              <p>Este es un correo de prueba generado automáticamente desde el <strong>Módulo de Correspondencia & Hojas de Ruta del Club Hípico Los Sargentos</strong>.</p>
              <p>La configuración del servidor emisor <strong>(${config.host}:${config.port})</strong> es correcta y se encuentra lista para el envío automático de acuses de recibo a socios y remitentes.</p>
              <p style="font-size: 12px; color: #64748b;">Fecha y Hora: ${new Date().toLocaleString('es-BO')}</p>
            </div>
            <div class="footer">
              Club Hípico Los Sargentos — La Paz, Bolivia<br>
              Mensaje automático institucional. Por favor no responder a este correo.
            </div>
          </div>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: testRecipient,
        subject: `[CHLS] Verificación de Correo Saliente — Correspondencia Oficial`,
        html,
      });

      return { success: true, message: `Correo de prueba enviado exitosamente a ${testRecipient}` };
    } catch (error: any) {
      console.error('[CorrespondenceEmailService] Error al enviar correo de prueba:', error);
      return { success: false, message: error.message || 'Error al conectar con el servidor SMTP' };
    }
  }

  /**
   * Envía el Acuse de Recibo Oficial al Socio / Remitente cuando se radica su Hoja de Ruta
   */
  public async sendRouteSheetReceiptEmail(routeSheet: any): Promise<boolean> {
    try {
      const config = await this.getSmtpConfig();
      if (!config.enabled || !config.user || !config.pass) {
        return false;
      }

      const recipientEmail = routeSheet.senderEmail;
      if (!recipientEmail || !recipientEmail.includes('@')) {
        return false;
      }

      const transporter = this.createTransporter(config);
      const origin = process.env.FRONTEND_URL || 'http://localhost:5173';
      const trackingUrl = `${origin}/correspondencia?code=${encodeURIComponent(routeSheet.hrCode)}`;

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
            .header { background: linear-gradient(135deg, #064e3b 0%, #047857 50%, #0f766e 100%); padding: 35px 25px; text-align: center; color: #ffffff; position: relative; }
            .header-gold-pill { display: inline-block; background: rgba(251, 191, 36, 0.2); border: 1px solid #fbbf24; color: #fbbf24; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; padding: 4px 12px; rounded: 20px; border-radius: 20px; margin-bottom: 12px; }
            .logo-title { font-size: 22px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; margin: 0; color: #ffffff; }
            .logo-sub { font-size: 12px; font-weight: 700; letter-spacing: 1px; color: #a7f3d0; text-transform: uppercase; margin-top: 4px; }
            .content { padding: 30px; color: #334155; }
            .greeting { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 15px; }
            .ticket-card { background: #f8fafc; border: 2px solid #10b981; border-radius: 16px; padding: 20px; margin: 20px 0; text-align: center; }
            .hr-code-label { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #047857; letter-spacing: 1.5px; }
            .hr-code-val { font-size: 26px; font-weight: 900; color: #0f172a; font-family: monospace; letter-spacing: 2px; margin: 6px 0; }
            .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
            .info-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
            .info-table td.label { font-weight: 800; color: #64748b; text-transform: uppercase; font-size: 11px; width: 35%; }
            .info-table td.value { font-weight: 700; color: #0f172a; }
            .btn-action { display: block; width: fit-content; margin: 25px auto 10px; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 14px; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 15px rgba(5, 150, 105, 0.35); text-align: center; }
            .security-notice { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px; margin-top: 20px; font-size: 12px; color: #166534; line-height: 1.5; }
            .footer { background: #f8fafc; padding: 25px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="header-gold-pill">Acuse de Recibo Oficial</div>
              <div class="logo-title">CLUB HÍPICO LOS SARGENTOS</div>
              <div class="logo-sub">Sistema Institucional de Correspondencia & Hojas de Ruta</div>
            </div>

            <div class="content">
              <div class="greeting">Estimado(a) ${routeSheet.senderName || 'Socio / Remitente'}:</div>
              
              <p style="font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                Le confirmamos que su correspondencia ha sido recibida y radicada formalmente en nuestro sistema institucional bajo la siguiente <strong>Hoja de Ruta</strong>:
              </p>

              <div class="ticket-card">
                <div class="hr-code-label">N° de Hoja de Ruta Oficial</div>
                <div class="hr-code-val">${routeSheet.hrCode}</div>
                <div style="font-size: 12px; color: #059669; font-weight: bold;">
                  ✓ Registrado en Despacho Institucional
                </div>
              </div>

              <table class="info-table">
                <tr>
                  <td class="label">Fecha y Hora:</td>
                  <td class="value">${new Date(routeSheet.createdAt).toLocaleString('es-BO')}</td>
                </tr>
                <tr>
                  <td class="label">Remitente:</td>
                  <td class="value">${routeSheet.senderName} (${routeSheet.senderType || 'SOCIO'})</td>
                </tr>
                ${routeSheet.cite ? `
                <tr>
                  <td class="label">CITE / Nota:</td>
                  <td class="value" style="font-family: monospace;">${routeSheet.cite}</td>
                </tr>` : ''}
                <tr>
                  <td class="label">N° de Fojas:</td>
                  <td class="value">${routeSheet.pageCount || 1} fojas</td>
                </tr>
                <tr>
                  <td class="label">Asunto / Referencia:</td>
                  <td class="value">${routeSheet.reference}</td>
                </tr>
                <tr>
                  <td class="label">Despacho Inicial:</td>
                  <td class="value" style="color: #047857;">${routeSheet.currentArea || 'SECRETARÍA GENERAL'}</td>
                </tr>
              </table>

              <a href="${trackingUrl}" target="_blank" class="btn-action">
                🔍 Consultar Estado de Trámite en Línea
              </a>

              <div class="security-notice">
                <strong>🛡️ Cadena de Custodia & Seguridad Criptográfica:</strong><br>
                Este trámite cuenta con registro inmutable en base de datos y certificación de integridad. Puede hacer seguimiento en cualquier momento utilizando su número de Hoja de Ruta.
              </div>
            </div>

            <div class="footer">
              <strong>Club Hípico Los Sargentos</strong><br>
              Av. Los Sargentos s/n, Obrajes • La Paz, Bolivia<br>
              <span style="font-size: 10px; color: #94a3b8;">
                Este es un mensaje institucional automático. Por favor no responda a este correo electrónico.
              </span>
            </div>
          </div>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: recipientEmail,
        subject: `[CHLS] Acuse de Recibo: Hoja de Ruta ${routeSheet.hrCode} — ${routeSheet.reference.substring(0, 50)}`,
        html,
      });

      console.log(`[CorrespondenceEmailService] Acuse de recibo enviado a ${recipientEmail} para HR ${routeSheet.hrCode}`);
      return true;
    } catch (err) {
      console.error('[CorrespondenceEmailService] Error al enviar acuse de recibo:', err);
      return false;
    }
  }

  /**
   * Envía correo de Alerta de Vencimiento SLA al responsable del Área
   */
  public async sendSlaAlertEmail(
    routeSheet: any,
    targetInfo: { name: string; email: string; area: string },
    slaData: { deadlineText: string; statusLabel: string; isOverdue: boolean },
    urgencyNote?: string
  ): Promise<boolean> {
    try {
      const config = await this.getSmtpConfig();
      if (!config.enabled || !config.user || !config.pass) {
        return false;
      }

      if (!targetInfo.email || !targetInfo.email.includes('@')) {
        return false;
      }

      const transporter = this.createTransporter(config);
      const origin = process.env.FRONTEND_URL || 'http://localhost:5173';
      const trackingUrl = `${origin}/correspondencia?code=${encodeURIComponent(routeSheet.hrCode)}`;

      const badgeColor = slaData.isOverdue ? '#ef4444' : '#f59e0b';
      const badgeBg = slaData.isOverdue ? '#fee2e2' : '#fef3c7';

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
            .header { background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #b91c1c 100%); padding: 30px 25px; text-align: center; color: #ffffff; }
            .badge-sla { display: inline-block; background: ${badgeBg}; color: ${badgeColor}; font-weight: 900; font-size: 11px; padding: 6px 16px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1.5px; border: 1px solid ${badgeColor}; margin-bottom: 12px; }
            .title { font-size: 20px; font-weight: 900; color: #ffffff; margin: 0; letter-spacing: 1px; }
            .content { padding: 30px; color: #334155; }
            .card { background: #f8fafc; border-left: 4px solid ${badgeColor}; border-radius: 12px; padding: 18px; margin: 20px 0; }
            .table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
            .table td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
            .btn { display: block; width: fit-content; margin: 25px auto; background: #059669; color: #ffffff !important; text-decoration: none; padding: 12px 26px; border-radius: 12px; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="badge-sla">⚠️ Notificación de Urgencia Institucional</div>
              <div class="title">ALERTA DE CUMPLIMIENTO DE PLAZO (SLA)</div>
              <p style="color: #fca5a5; font-size: 12px; margin: 6px 0 0 0; text-transform: uppercase; font-weight: 700;">Club Hípico Los Sargentos — Control de Gestión</p>
            </div>
            <div class="content">
              <p style="font-size: 14px;"><strong>Estimado(a) ${targetInfo.name || targetInfo.area}:</strong></p>
              <p style="font-size: 13px; line-height: 1.6;">
                Se le recuerda que el siguiente trámite institucional en custodia de su departamento se encuentra <strong>${slaData.statusLabel}</strong>:
              </p>

              <div class="card">
                <div style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase;">Hoja de Ruta</div>
                <div style="font-size: 22px; font-weight: 900; color: #0f172a; font-family: monospace;">${routeSheet.hrCode}</div>
                <div style="margin-top: 6px; font-size: 12px; color: ${badgeColor}; font-weight: 800;">
                  Fecha Límite de Atención: ${slaData.deadlineText}
                </div>
              </div>

              <table class="table">
                <tr>
                  <td style="font-weight: 800; color: #64748b; width: 35%;">ASUNTO:</td>
                  <td style="font-weight: 700; color: #0f172a;">${routeSheet.reference}</td>
                </tr>
                <tr>
                  <td style="font-weight: 800; color: #64748b;">REMITENTE:</td>
                  <td style="font-weight: 700;">${routeSheet.senderName} (${routeSheet.senderArea || routeSheet.senderType})</td>
                </tr>
                <tr>
                  <td style="font-weight: 800; color: #64748b;">PRIORIDAD:</td>
                  <td style="font-weight: 800; color: #b91c1c;">${routeSheet.priority}</td>
                </tr>
                <tr>
                  <td style="font-weight: 800; color: #64748b;">ÁREA ACTUAL:</td>
                  <td style="font-weight: 800; color: #047857;">${routeSheet.currentArea}</td>
                </tr>
              </table>

              ${urgencyNote ? `
              <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 10px; padding: 14px; margin-top: 15px; font-size: 12px; color: #92400e;">
                <strong>Nota del Remitente / Gerencia:</strong><br>
                "${urgencyNote}"
              </div>
              ` : ''}

              <a href="${trackingUrl}" target="_blank" class="btn">
                ⚡ Atender y Proveer Trámite Ahora
              </a>
            </div>
            <div class="footer">
              Club Hípico Los Sargentos — Sistema Automatizado de Correspondencia<br>
              Generado automáticamente según la política de tiempos SLA institucional.
            </div>
          </div>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: targetInfo.email,
        subject: `[URGENTE CHLS] Alerta SLA: ${routeSheet.hrCode} — ${routeSheet.reference.substring(0, 45)}`,
        html,
      });

      console.log(`[CorrespondenceEmailService] Alerta SLA enviada a ${targetInfo.email} para HR ${routeSheet.hrCode}`);
      return true;
    } catch (err) {
      console.error('[CorrespondenceEmailService] Error al enviar alerta SLA:', err);
      return false;
    }
  }
}
