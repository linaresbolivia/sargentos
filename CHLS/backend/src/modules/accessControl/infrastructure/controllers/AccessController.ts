import { Request, Response, Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { SearchMemberForAccessUseCase } from '../../application/useCases/SearchMemberForAccessUseCase';
import { RegisterAccessLogUseCase } from '../../application/useCases/RegisterAccessLogUseCase';
import { GetRecentLogsUseCase } from '../../application/useCases/GetRecentLogsUseCase';
import { RegisterGuestUseCase } from '../../application/useCases/RegisterGuestUseCase';
import { RegisterStandalonePersonUseCase } from '../../application/useCases/RegisterStandalonePersonUseCase';
import { UpdateAccessLogUseCase } from '../../application/useCases/UpdateAccessLogUseCase';
import { authenticate, authorize } from '@modules/auth/infrastructure/middlewares/auth.middleware';

export const DEFAULT_PISCINA_FACILITIES = [
  { id: 'piscina_5_carriles', name: 'PISCINA 5 CARRILES', value: '30', unit: '°', status: 'OPTIMO', type: 'TEMP', order: 1 },
  { id: 'piscina_3_carriles', name: 'PISCINA 3 CARRILES', value: '30', unit: '°', status: 'OPTIMO', type: 'TEMP', order: 2 },
  { id: 'jacuzzi', name: 'JACUZZI', value: '41', unit: '°', status: 'OPTIMO', type: 'TEMP', order: 3 },
  { id: 'sauna_v_hierbas', name: 'SAUNA V. HIERBAS', value: '36', unit: '°', status: 'OPTIMO', type: 'TEMP', order: 4 },
  { id: 'sauna_seco', name: 'SAUNA SECO', value: 'Ok', unit: '', status: 'OPTIMO', type: 'STATUS', order: 5 },
  { id: 'sauna_eucalipto', name: 'SAUNA EUCALIPTO', value: '36', unit: '°', status: 'OPTIMO', type: 'TEMP', order: 6 }
];

export class AccessController {
  public router = Router();
  private prisma = new PrismaClient();
  private searchUseCase = new SearchMemberForAccessUseCase(this.prisma);
  private registerLogUseCase = new RegisterAccessLogUseCase(this.prisma);
  private getLogsUseCase = new GetRecentLogsUseCase(this.prisma);
  private registerGuestUseCase = new RegisterGuestUseCase();
  private registerStandalonePersonUseCase = new RegisterStandalonePersonUseCase(this.prisma);
  private updateLogUseCase = new UpdateAccessLogUseCase(this.prisma);

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Authenticate all requests
    this.router.use(authenticate);

    // Live occupancy can be checked by members, socio, staff, and admins
    this.router.get('/live-occupancy', authorize(['ADMIN', 'STAFF', 'SUPER_ADMIN', 'MEMBER', 'SOCIO', 'USER']), this.getLiveOccupancy.bind(this));

    // Admin, Staff, SuperAdmin, and Access Control / Porteria module authorized users
    this.router.use(authorize(['ADMIN', 'STAFF', 'SUPER_ADMIN', 'MODULO_CONTROL_ACCESO', 'MODULO_PORTERIA']));

    this.router.get('/search', this.search.bind(this));
    this.router.post('/log', this.registerLog.bind(this));
    this.router.put('/log/:id', this.updateLog.bind(this));
    this.router.get('/logs/recent', this.getRecentLogs.bind(this));
    this.router.post('/guest', this.registerGuest.bind(this));
    this.router.post('/standalone-person', this.registerStandalonePerson.bind(this));

    // Area Access Routes (Piscina / Gimnasio)
    this.router.get('/area-logs', this.getAreaLogs.bind(this));
    this.router.post('/area-logs', this.registerAreaLog.bind(this));
    this.router.put('/area-logs/:id/exit', this.registerAreaExit.bind(this));
    this.router.get('/area-stats', this.getAreaStats.bind(this));
    this.router.get('/today-gatehouse', this.getTodayGatehouseEntries.bind(this));
    this.router.get('/executive-analytics', this.getExecutiveAnalytics.bind(this));

    // Dynamic Area Configuration & Pool Temperature Control
    this.router.get('/area-config', this.getAreaConfig.bind(this));
    this.router.put('/area-config', this.updateAreaConfig.bind(this));
    this.router.post('/pool-temperature', this.registerPoolTemperature.bind(this));
    this.router.get('/pool-temperature/latest', this.getLatestPoolTemperature.bind(this));
    this.router.get('/pool-temperature/history', this.getPoolTemperatureHistory.bind(this));
  }

  private async search(req: Request, res: Response) {
    try {
      const q = req.query.q as string;
      const type = (req.query.type as string) || 'SOCIO';
      const results = await this.searchUseCase.execute(q, type);
      res.status(200).json({ success: true, data: results });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Error buscando socio' });
    }
  }

  private async registerLog(req: Request, res: Response) {
    try {
      const log = await this.registerLogUseCase.execute(req.body);
      res.status(201).json({ success: true, data: log });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Error registrando acceso' });
    }
  }

  private async getRecentLogs(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const personId = req.query.personId ? (req.query.personId as string) : undefined;
      const startDate = req.query.startDate ? (req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? (req.query.endDate as string) : undefined;
      
      const logs = await this.getLogsUseCase.execute(limit, personId, startDate, endDate);
      res.status(200).json({ success: true, data: logs });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Error obteniendo historial de accesos' });
    }
  }

  private async registerGuest(req: Request, res: Response) {
    try {
      const result = await this.registerGuestUseCase.execute(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message || 'Error registrando invitado' });
    }
  }

  private async updateLog(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const log = await this.updateLogUseCase.execute({ id, ...req.body });
      res.status(200).json({ success: true, data: log });
    } catch (error: any) {
      console.error(error);
      if (error.message.includes('expirado')) {
        res.status(403).json({ success: false, message: error.message });
      } else {
        res.status(500).json({ success: false, message: 'Error actualizando el acceso' });
      }
    }
  }

  private async registerStandalonePerson(req: Request, res: Response) {
    try {
      const person = await this.registerStandalonePersonUseCase.execute(req.body);
      res.status(201).json({ success: true, data: person });
    } catch (error: any) {
      console.error(error);
      res.status(400).json({ success: false, message: error.message || 'Error registrando persona' });
    }
  }

  // --- ÁREAS (PISCINA / GIMNASIO) ---

  private async getAreaLogs(req: Request, res: Response) {
    try {
      const area = (req.query.area as string)?.toUpperCase();
      const status = req.query.status as string;
      const search = req.query.search as string;
      const date = req.query.date as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const gender = req.query.gender as string;
      const dependency = req.query.dependency as string;
      const limit = req.query.limit ? Number(req.query.limit) : 2000;
      
      const where: any = {};
      if (area && area !== 'ALL') {
        where.area = area;
      }

      if (status && status !== 'ALL') {
        where.status = status;
      }

      if (gender && gender !== 'ALL') {
        where.gender = gender;
      }

      if (dependency && dependency !== 'ALL') {
        where.dependency = dependency;
      }

      if (startDate || endDate) {
        where.entryTime = {};
        if (startDate) {
          const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
          where.entryTime.gte = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);
        }
        if (endDate) {
          const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
          where.entryTime.lte = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);
        }
      } else if (date) {
        const [dYear, dMonth, dDay] = date.split('-').map(Number);
        where.entryTime = {
          gte: new Date(dYear, dMonth - 1, dDay, 0, 0, 0, 0),
          lte: new Date(dYear, dMonth - 1, dDay, 23, 59, 59, 999)
        };
      }

      if (search && search.trim() !== '') {
        const term = search.trim();
        where.OR = [
          { personName: { contains: term, mode: 'insensitive' } },
          { memberCode: { contains: term, mode: 'insensitive' } },
          { lockerKey: { contains: term, mode: 'insensitive' } },
          { towelNumber: { contains: term, mode: 'insensitive' } },
          { documentId: { contains: term, mode: 'insensitive' } },
          { observations: { contains: term, mode: 'insensitive' } }
        ];
      }

      const logs = await this.prisma.areaAccessLog.findMany({
        where,
        orderBy: { entryTime: 'desc' },
        include: {
          person: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              photoUrl: true,
              documentId: true,
              mobile: true
            }
          }
        },
        take: limit
      });

      // Check if any currently active area log has a subsequent EXIT registered at Caseta today
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

      const todayCasetaExits = await this.prisma.accessLog.findMany({
        where: {
          actionType: 'EXIT',
          status: 'GRANTED',
          timestamp: { gte: startOfDay, lte: endOfDay }
        },
        select: {
          personId: true,
          timestamp: true,
          person: { select: { firstName: true, lastName: true } },
          guest: { select: { firstName: true, lastName: true } }
        }
      });

      const enrichedLogs = logs.map(l => {
        if (l.status === 'DENTRO') {
          const logPersonName = l.personName.toLowerCase().trim();

          const matchingExit = todayCasetaExits.find(ex => {
            if (l.personId && ex.personId && l.personId === ex.personId) return true;

            const exName = ex.person 
              ? `${ex.person.firstName} ${ex.person.lastName}`.trim().toLowerCase() 
              : (ex.guest ? `${ex.guest.firstName} ${ex.guest.lastName}`.trim().toLowerCase() : '');

            if (exName && (exName === logPersonName || logPersonName.includes(exName) || exName.includes(logPersonName))) return true;

            // Match INVITADO VIP observation name
            return false;
          });

          if (matchingExit && new Date(matchingExit.timestamp) >= new Date(l.entryTime)) {
            return {
              ...l,
              casetaExitDetected: true,
              casetaExitTime: matchingExit.timestamp
            };
          }
        }
        return l;
      });

      res.status(200).json({ success: true, data: enrichedLogs });
    } catch (error: any) {
      console.error('Error fetching area logs:', error);
      res.status(500).json({ success: false, message: 'Error al obtener registros del área' });
    }
  }

  private async registerAreaLog(req: Request, res: Response) {
    try {
      const {
        area,
        memberCode,
        personName,
        documentId,
        dependency,
        gender,
        lockerKey,
        towelNumber,
        towelQty,
        towelSize,
        observations,
        personId,
        entryTime
      } = req.body;

      if (!area || !personName) {
        res.status(400).json({ success: false, message: 'Área y Nombre son requeridos' });
        return;
      }

      const calculatedQty = towelNumber ? 1 : (towelQty !== undefined ? Number(towelQty) : 0);

      const newLog = await this.prisma.areaAccessLog.create({
        data: {
          area: String(area).toUpperCase(),
          memberCode: memberCode ? String(memberCode).trim() : null,
          personName: String(personName).trim(),
          documentId: documentId ? String(documentId).trim() : null,
          dependency: dependency || 'TITULAR',
          gender: gender || 'VARON',
          lockerKey: lockerKey ? String(lockerKey).trim() : null,
          towelNumber: towelNumber ? String(towelNumber).trim() : null,
          towelQty: calculatedQty,
          towelSize: towelSize || (towelNumber ? 'GRANDE' : 'NINGUNA'),
          observations: observations ? String(observations).trim() : null,
          status: 'DENTRO',
          personId: personId || null,
          entryTime: entryTime ? new Date(entryTime) : new Date()
        },
        include: {
          person: {
            select: {
              photoUrl: true
            }
          }
        }
      });

      res.status(201).json({ success: true, data: newLog });
    } catch (error: any) {
      console.error('Error registering area log:', error);
      res.status(500).json({ success: false, message: 'Error registrando ingreso al área' });
    }
  }

  private async registerAreaExit(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updatedLog = await this.prisma.areaAccessLog.update({
        where: { id },
        data: {
          status: 'SALIO',
          exitTime: new Date()
        }
      });
      res.status(200).json({ success: true, data: updatedLog });
    } catch (error: any) {
      console.error('Error registering area exit:', error);
      res.status(500).json({ success: false, message: 'Error registrando salida del área' });
    }
  }

  private async getAreaStats(req: Request, res: Response) {
    try {
      const area = ((req.query.area as string) || 'PISCINA').toUpperCase();
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

      // Find or create area config
      const rawRows: any[] = await this.prisma.$queryRawUnsafe(
        `SELECT * FROM area_configs WHERE area = $1 LIMIT 1`,
        area
      );
      let config = rawRows && rawRows.length > 0 ? rawRows[0] : null;
      if (!config) {
        config = {
          totalLockers: area === 'PISCINA' ? 50 : 40,
          maxCapacity: area === 'PISCINA' ? 50 : 45,
          facilities: area === 'PISCINA' ? DEFAULT_PISCINA_FACILITIES : []
        };
      }

      const currentlyInside = await this.prisma.areaAccessLog.count({
        where: {
          area,
          status: 'DENTRO'
        }
      });

      const totalToday = await this.prisma.areaAccessLog.count({
        where: {
          area,
          entryTime: { gte: startOfDay, lte: endOfDay }
        }
      });

      const lockersInUse = await this.prisma.areaAccessLog.count({
        where: {
          area,
          status: 'DENTRO',
          lockerKey: { not: null }
        }
      });

      const todayLogsWithTowels = await this.prisma.areaAccessLog.findMany({
        where: {
          area,
          entryTime: { gte: startOfDay, lte: endOfDay },
          OR: [
            { towelNumber: { not: null } },
            { towelQty: { gt: 0 } }
          ]
        },
        select: { towelNumber: true, towelQty: true, towelSize: true }
      });

      const towelsLoanedToday = todayLogsWithTowels.length;
      const lockersAvailable = Math.max(config.totalLockers - lockersInUse, 0);

      // Pool Temperature data if area is PISCINA
      let poolTempData: any = null;
      if (area === 'PISCINA') {
        const latestTemp = await this.prisma.poolTemperatureLog.findFirst({
          orderBy: { recordedAt: 'desc' }
        });

        if (latestTemp) {
          const diffMinutes = Math.floor((today.getTime() - new Date(latestTemp.recordedAt).getTime()) / (1000 * 60));
          poolTempData = {
            temperature: latestTemp.temperature,
            ambientTemp: latestTemp.ambientTemp,
            phLevel: latestTemp.phLevel,
            chlorineLevel: latestTemp.chlorineLevel,
            notes: latestTemp.notes,
            recordedBy: latestTemp.recordedBy,
            recordedAt: latestTemp.recordedAt,
            diffMinutes,
            needsCheck: diffMinutes >= 120 // 2 hours
          };
        } else {
          poolTempData = {
            temperature: 28.0,
            recordedAt: null,
            diffMinutes: null,
            needsCheck: true // No check recorded yet
          };
        }
      }

      const facilities = (config as any).facilities || (area === 'PISCINA' ? DEFAULT_PISCINA_FACILITIES : []);

      res.status(200).json({
        success: true,
        data: {
          currentlyInside,
          totalToday,
          lockersInUse,
          towelsLoanedToday,
          totalLockers: config.totalLockers,
          maxCapacity: config.maxCapacity,
          lockersAvailable,
          poolTemp: poolTempData,
          facilities
        }
      });
    } catch (error: any) {
      console.error('Error fetching area stats:', error);
      res.status(500).json({ success: false, message: 'Error obteniendo métricas del área' });
    }
  }

  private async getTodayGatehouseEntries(req: Request, res: Response) {
    try {
      const search = req.query.search as string;
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

      const where: any = {
        status: 'GRANTED',
        timestamp: { gte: startOfDay, lte: endOfDay }
      };

      if (search && search.trim() !== '') {
        const term = search.trim();
        where.OR = [
          { person: { firstName: { contains: term, mode: 'insensitive' } } },
          { person: { lastName: { contains: term, mode: 'insensitive' } } },
          { person: { documentId: { contains: term, mode: 'insensitive' } } },
          { guest: { firstName: { contains: term, mode: 'insensitive' } } },
          { guest: { lastName: { contains: term, mode: 'insensitive' } } },
        ];
      }

      const allMovements = await this.prisma.accessLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        include: {
          person: {
            include: {
              titularMemberships: { select: { membershipNumber: true } },
              beneficiaries: {
                include: {
                  membership: { select: { membershipNumber: true } }
                }
              }
            }
          },
          guest: true
        }
      });

      const activeAreaLogs = await this.prisma.areaAccessLog.findMany({
        where: { status: 'DENTRO' },
        select: {
          id: true,
          area: true,
          personId: true,
          personName: true,
          lockerKey: true,
          entryTime: true,
          towelQty: true
        }
      });

      const seenPersons = new Set<string>();
      const currentClubMembers: any[] = [];

      for (const log of allMovements) {
        const vipName = log.observation ? log.observation.replace(/^(PASE VIP|INVITADO VIP|Pase VIP):\s*/i, '').trim() : '';
        const key = log.personId 
          || log.guestId 
          || (log.person ? `${log.person.firstName}_${log.person.lastName}` : null) 
          || (log.guest ? `${log.guest.firstName}_${log.guest.lastName}` : null) 
          || (vipName ? `vip_${vipName.toLowerCase()}` : null)
          || log.id;

        if (!key || seenPersons.has(key)) continue;
        seenPersons.add(key);

        const pId = log.person?.id;
        const pName = log.person 
          ? `${log.person.firstName} ${log.person.lastName}`.trim() 
          : (log.guest ? `${log.guest.firstName} ${log.guest.lastName}`.trim() : vipName);

        const currentActive = activeAreaLogs.find(a => {
          if (pId && a.personId === pId) return true;
          if (pName && (a.personName.toLowerCase().includes(pName.toLowerCase()) || pName.toLowerCase().includes(a.personName.toLowerCase()))) return true;
          if (vipName && (a.personName.toLowerCase().includes(vipName.toLowerCase()) || vipName.toLowerCase().includes(a.personName.toLowerCase()))) return true;
          return false;
        });

        const hasLeftClub = log.actionType === 'EXIT';

        currentClubMembers.push({
          ...log,
          hasLeftClub,
          activeArea: currentActive || null
        });
      }

      res.status(200).json({ success: true, data: currentClubMembers });
    } catch (error: any) {
      console.error('Error fetching today gatehouse entries:', error);
      res.status(500).json({ success: false, message: 'Error obteniendo ingresos de caseta de hoy' });
    }
  }

  private async getLiveOccupancy(req: Request, res: Response) {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

      // Dynamic Area Configs
      const piscinaRows: any[] = await this.prisma.$queryRawUnsafe(
        `SELECT * FROM area_configs WHERE area = 'PISCINA' LIMIT 1`
      );
      const piscinaConfig = piscinaRows && piscinaRows.length > 0 ? piscinaRows[0] : { totalLockers: 50, maxCapacity: 50, facilities: DEFAULT_PISCINA_FACILITIES };

      const gimnasioRows: any[] = await this.prisma.$queryRawUnsafe(
        `SELECT * FROM area_configs WHERE area = 'GIMNASIO' LIMIT 1`
      );
      const gimnasioConfig = gimnasioRows && gimnasioRows.length > 0 ? gimnasioRows[0] : { totalLockers: 40, maxCapacity: 45 };

      // Piscina live metrics
      const piscinaInside = await this.prisma.areaAccessLog.count({
        where: { area: 'PISCINA', status: 'DENTRO' }
      });
      const piscinaToday = await this.prisma.areaAccessLog.count({
        where: { area: 'PISCINA', entryTime: { gte: startOfDay, lte: endOfDay } }
      });
      const piscinaLockersInUse = await this.prisma.areaAccessLog.count({
        where: { area: 'PISCINA', status: 'DENTRO', lockerKey: { not: null } }
      });

      // Gimnasio live metrics
      const gimnasioInside = await this.prisma.areaAccessLog.count({
        where: { area: 'GIMNASIO', status: 'DENTRO' }
      });
      const gimnasioToday = await this.prisma.areaAccessLog.count({
        where: { area: 'GIMNASIO', entryTime: { gte: startOfDay, lte: endOfDay } }
      });
      const gimnasioLockersInUse = await this.prisma.areaAccessLog.count({
        where: { area: 'GIMNASIO', status: 'DENTRO', lockerKey: { not: null } }
      });

      // Gatehouse overall club metrics
      const casetaTotalToday = await this.prisma.accessLog.count({
        where: { actionType: 'ENTRY', status: 'GRANTED', timestamp: { gte: startOfDay, lte: endOfDay } }
      });

      // Latest real pool temperature
      const latestTemp = await this.prisma.poolTemperatureLog.findFirst({
        orderBy: { recordedAt: 'desc' }
      });

      const waterTemp = latestTemp ? latestTemp.temperature : 28.0;
      const lastTempRecordedAt = latestTemp ? latestTemp.recordedAt : null;

      // Today's hourly distribution for Piscina and Gimnasio (06:00 to 22:00)
      const todayLogs = await this.prisma.areaAccessLog.findMany({
        where: { entryTime: { gte: startOfDay, lte: endOfDay } },
        select: { area: true, entryTime: true }
      });

      const hourlyCurve = Array.from({ length: 16 }, (_, i) => {
        const hour = i + 6;
        const hourPiscina = todayLogs.filter(l => l.area === 'PISCINA' && new Date(l.entryTime).getHours() === hour).length;
        const hourGimnasio = todayLogs.filter(l => l.area === 'GIMNASIO' && new Date(l.entryTime).getHours() === hour).length;
        return {
          hour: `${hour.toString().padStart(2, '0')}:00`,
          piscina: hourPiscina,
          gimnasio: hourGimnasio,
          total: hourPiscina + hourGimnasio
        };
      });

      const piscinaOccupancyRate = Math.min(Math.round((piscinaInside / (piscinaConfig.maxCapacity || 50)) * 100), 100);
      const gimnasioOccupancyRate = Math.min(Math.round((gimnasioInside / (gimnasioConfig.maxCapacity || 45)) * 100), 100);

      // Best hours recommendation
      const currentHour = today.getHours();
      let piscinaRecommendation = 'Horario favorable con excelente disponibilidad de carriles y casilleros.';
      if (piscinaOccupancyRate > 75) {
        piscinaRecommendation = 'Afluencia alta en este momento. Se sugiere asistir después de las 13:00 o después de las 19:30.';
      } else if (piscinaOccupancyRate > 45) {
        piscinaRecommendation = 'Afluencia moderada. Carriles y solarium con buena rotación.';
      }

      let gimnasioRecommendation = 'Espacio óptimo con máquinas libres y disponibilidad completa.';
      if (gimnasioOccupancyRate > 75) {
        gimnasioRecommendation = 'Horario concurrido. Se sugiere asistir al mediodía (13:00 - 16:00) para mayor comodidad.';
      } else if (gimnasioOccupancyRate > 45) {
        gimnasioRecommendation = 'Afluencia media. Sala de musculación y cardio operando con normalidad.';
      }

      const piscinaFacilities = (piscinaConfig as any).facilities || DEFAULT_PISCINA_FACILITIES;

      const p5 = piscinaFacilities.find((f: any) => f.id === 'piscina_5_carriles' || f.name?.includes('5'));
      const p3 = piscinaFacilities.find((f: any) => f.id === 'piscina_3_carriles' || f.name?.includes('3'));
      const p5Val = parseFloat(p5?.value || '30') || 30;
      const p3Val = parseFloat(p3?.value || '30') || 30;
      const avgWaterTemp = Math.round(((p5Val + p3Val) / 2) * 10) / 10;

      res.status(200).json({
        success: true,
        data: {
          timestamp: today,
          currentHour,
          piscina: {
            inside: piscinaInside,
            capacity: piscinaConfig.maxCapacity,
            occupancyRate: piscinaOccupancyRate,
            todayTotal: piscinaToday,
            totalLockers: piscinaConfig.totalLockers,
            lockersInUse: piscinaLockersInUse,
            lockersAvailable: Math.max(piscinaConfig.totalLockers - piscinaLockersInUse, 0),
            waterTemp: avgWaterTemp,
            piscina5Temp: p5?.value || '30',
            piscina3Temp: p3?.value || '30',
            lastTempRecordedAt: today,
            totalLanes: 8,
            lanesAvailable: Math.max(8 - Math.ceil(piscinaInside / 6), 1),
            status: piscinaOccupancyRate < 50 ? 'OPTIMO' : (piscinaOccupancyRate < 80 ? 'MODERADO' : 'CONCURRIDO'),
            recommendation: piscinaRecommendation,
            facilities: piscinaFacilities
          },
          gimnasio: {
            inside: gimnasioInside,
            capacity: gimnasioConfig.maxCapacity,
            occupancyRate: gimnasioOccupancyRate,
            todayTotal: gimnasioToday,
            totalLockers: gimnasioConfig.totalLockers,
            lockersInUse: gimnasioLockersInUse,
            lockersAvailable: Math.max(gimnasioConfig.totalLockers - gimnasioLockersInUse, 0),
            status: gimnasioOccupancyRate < 50 ? 'OPTIMO' : (gimnasioOccupancyRate < 80 ? 'MODERADO' : 'CONCURRIDO'),
            recommendation: gimnasioRecommendation
          },
          gatehouse: {
            todayTotal: casetaTotalToday,
            status: 'FLUIDO'
          },
          hourlyCurve
        }
      });
    } catch (error: any) {
      console.error('Error fetching live occupancy:', error);
      res.status(500).json({ success: false, message: 'Error al obtener aforo en tiempo real' });
    }
  }

  private async getExecutiveAnalytics(req: Request, res: Response) {
    try {
      const area = (req.query.area as string)?.toUpperCase();
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      const where: any = {};
      if (area && area !== 'ALL') {
        where.area = area;
      }

      if (startDate || endDate) {
        where.entryTime = {};
        if (startDate) {
          const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
          where.entryTime.gte = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);
        }
        if (endDate) {
          const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
          where.entryTime.lte = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);
        }
      }

      const logs = await this.prisma.areaAccessLog.findMany({
        where,
        orderBy: { entryTime: 'asc' }
      });

      const totalVisits = logs.length;
      const piscinaCount = logs.filter(l => l.area === 'PISCINA').length;
      const gimnasioCount = logs.filter(l => l.area === 'GIMNASIO').length;
      const maleCount = logs.filter(l => l.gender === 'VARON').length;
      const femaleCount = logs.filter(l => l.gender === 'MUJER').length;
      const lockersCount = logs.filter(l => Boolean(l.lockerKey)).length;
      const towelsCount = logs.filter(l => Boolean(l.towelNumber) || (l.towelQty && l.towelQty > 0)).length;

      // Towel sizes breakdown
      const towelSizes = {
        grande: logs.filter(l => l.towelSize === 'GRANDE').length,
        pequena: logs.filter(l => l.towelSize === 'PEQUEÑA').length,
        ambas: logs.filter(l => l.towelSize === 'AMBAS').length
      };

      // Dependency breakdown
      const dependencyMap: Record<string, number> = {};
      for (const log of logs) {
        const dep = log.dependency || 'TITULAR';
        dependencyMap[dep] = (dependencyMap[dep] || 0) + 1;
      }

      const dependencyDistribution = Object.entries(dependencyMap).map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / (totalVisits || 1)) * 100)
      })).sort((a, b) => b.count - a.count);

      // Hourly curve (06:00 to 22:00)
      const hourlyDistribution = Array.from({ length: 16 }, (_, i) => {
        const hour = i + 6;
        const hourPiscina = logs.filter(l => l.area === 'PISCINA' && new Date(l.entryTime).getHours() === hour).length;
        const hourGimnasio = logs.filter(l => l.area === 'GIMNASIO' && new Date(l.entryTime).getHours() === hour).length;
        return {
          hour: `${hour.toString().padStart(2, '0')}:00`,
          piscina: hourPiscina,
          gimnasio: hourGimnasio,
          total: hourPiscina + hourGimnasio
        };
      });

      // Day of week distribution
      const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const dayOfWeekCounts = Array.from({ length: 7 }, (_, dayIdx) => {
        const dayLogs = logs.filter(l => new Date(l.entryTime).getDay() === dayIdx);
        return {
          day: daysOfWeek[dayIdx],
          piscina: dayLogs.filter(l => l.area === 'PISCINA').length,
          gimnasio: dayLogs.filter(l => l.area === 'GIMNASIO').length,
          total: dayLogs.length
        };
      });

      // Daily timeline trend
      const dailyMap: Record<string, { date: string; piscina: number; gimnasio: number; total: number }> = {};
      for (const log of logs) {
        const d = new Date(log.entryTime);
        const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!dailyMap[dStr]) {
          dailyMap[dStr] = { date: dStr, piscina: 0, gimnasio: 0, total: 0 };
        }
        if (log.area === 'PISCINA') dailyMap[dStr].piscina += 1;
        else dailyMap[dStr].gimnasio += 1;
        dailyMap[dStr].total += 1;
      }
      const dailyTrend = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

      // Stay durations average in minutes
      const completedStays = logs.filter(l => l.exitTime);
      const avgStayMinutes = completedStays.length > 0
        ? Math.round(completedStays.reduce((acc, l) => {
            const diff = (new Date(l.exitTime!).getTime() - new Date(l.entryTime).getTime()) / (1000 * 60);
            return acc + (diff > 0 && diff < 1440 ? diff : 0);
          }, 0) / completedStays.length)
        : 0;

      // Top 10 frequent visitors
      const visitorMap: Record<string, { name: string; memberCode: string | null; dependency: string; visits: number; totalMins: number }> = {};
      for (const log of logs) {
        const key = log.memberCode || log.personName;
        if (!visitorMap[key]) {
          visitorMap[key] = {
            name: log.personName,
            memberCode: log.memberCode,
            dependency: log.dependency,
            visits: 0,
            totalMins: 0
          };
        }
        visitorMap[key].visits += 1;
        if (log.exitTime) {
          const diff = (new Date(log.exitTime).getTime() - new Date(log.entryTime).getTime()) / (1000 * 60);
          if (diff > 0 && diff < 1440) visitorMap[key].totalMins += diff;
        }
      }

      const topVisitors = Object.values(visitorMap)
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 10)
        .map(v => ({
          ...v,
          avgMins: v.visits > 0 ? Math.round(v.totalMins / v.visits) : 0
        }));

      res.status(200).json({
        success: true,
        data: {
          totalVisits,
          piscinaCount,
          gimnasioCount,
          maleCount,
          femaleCount,
          lockersCount,
          towelsCount,
          towelSizes,
          avgStayMinutes,
          dependencyDistribution,
          hourlyDistribution,
          dayOfWeekCounts,
          dailyTrend,
          topVisitors
        }
      });
    } catch (error: any) {
      console.error('Error fetching executive analytics:', error);
      res.status(500).json({ success: false, message: 'Error generando analítica ejecutiva' });
    }
  }

  private async getAreaConfig(req: Request, res: Response) {
    try {
      const area = ((req.query.area as string) || 'PISCINA').toUpperCase();
      const rawRows: any[] = await this.prisma.$queryRawUnsafe(
        `SELECT * FROM area_configs WHERE area = $1 LIMIT 1`,
        area
      );

      let config = rawRows && rawRows.length > 0 ? rawRows[0] : null;

      if (!config) {
        const defaultFacs = area === 'PISCINA' ? DEFAULT_PISCINA_FACILITIES : [];
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO area_configs (id, area, "totalLockers", "maxCapacity", facilities, "createdAt", "updatedAt")
           VALUES (gen_random_uuid()::text, $1, $2, $3, $4::jsonb, NOW(), NOW())
           ON CONFLICT (area) DO NOTHING`,
          area,
          area === 'PISCINA' ? 50 : 40,
          area === 'PISCINA' ? 50 : 45,
          JSON.stringify(defaultFacs)
        );

        const createdRows: any[] = await this.prisma.$queryRawUnsafe(
          `SELECT * FROM area_configs WHERE area = $1 LIMIT 1`,
          area
        );
        config = createdRows && createdRows.length > 0 ? createdRows[0] : null;
      }

      const facilities = config?.facilities || (area === 'PISCINA' ? DEFAULT_PISCINA_FACILITIES : []);

      res.status(200).json({ 
        success: true, 
        data: {
          id: config?.id,
          area: config?.area || area,
          totalLockers: config?.totalLockers || (area === 'PISCINA' ? 50 : 40),
          maxCapacity: config?.maxCapacity || (area === 'PISCINA' ? 50 : 45),
          facilities
        } 
      });
    } catch (error: any) {
      console.error('Error fetching area config:', error);
      res.status(500).json({ success: false, message: 'Error al obtener configuración del área' });
    }
  }

  private async updateAreaConfig(req: Request, res: Response): Promise<void> {
    try {
      const { area, totalLockers, maxCapacity, facilities } = req.body;
      if (!area) {
        res.status(400).json({ success: false, message: 'El área es requerida' });
        return;
      }

      const areaKey = area.toUpperCase();
      const lockers = Number(totalLockers) || (areaKey === 'PISCINA' ? 50 : 40);
      const capacity = Number(maxCapacity) || (areaKey === 'PISCINA' ? 50 : 45);
      const defaultFacilities = areaKey === 'PISCINA' ? DEFAULT_PISCINA_FACILITIES : [];
      const facsToSave = facilities !== undefined ? facilities : defaultFacilities;

      await this.prisma.$executeRawUnsafe(
        `INSERT INTO area_configs (id, area, "totalLockers", "maxCapacity", facilities, "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4::jsonb, NOW(), NOW())
         ON CONFLICT (area) DO UPDATE 
         SET "totalLockers" = EXCLUDED."totalLockers",
             "maxCapacity" = EXCLUDED."maxCapacity",
             facilities = EXCLUDED.facilities,
             "updatedAt" = NOW()`,
        areaKey,
        lockers,
        capacity,
        JSON.stringify(facsToSave)
      );

      const rows: any[] = await this.prisma.$queryRawUnsafe(
        `SELECT * FROM area_configs WHERE area = $1 LIMIT 1`,
        areaKey
      );
      const updated = rows && rows.length > 0 ? rows[0] : null;

      res.status(200).json({ 
        success: true, 
        data: {
          id: updated?.id,
          area: updated?.area || areaKey,
          totalLockers: updated?.totalLockers || lockers,
          maxCapacity: updated?.maxCapacity || capacity,
          facilities: updated?.facilities || facsToSave
        }, 
        message: 'Configuración actualizada exitosamente' 
      });
    } catch (error: any) {
      console.error('Error updating area config:', error);
      res.status(500).json({ success: false, message: 'Error al actualizar configuración' });
    }
  }

  private async registerPoolTemperature(req: Request, res: Response): Promise<void> {
    try {
      const { temperature, ambientTemp, phLevel, chlorineLevel, notes, recordedBy } = req.body;
      if (temperature === undefined || temperature === null) {
        res.status(400).json({ success: false, message: 'La temperatura del agua es requerida' });
        return;
      }

      const log = await this.prisma.poolTemperatureLog.create({
        data: {
          temperature: parseFloat(temperature),
          ambientTemp: ambientTemp ? parseFloat(ambientTemp) : null,
          phLevel: phLevel ? parseFloat(phLevel) : null,
          chlorineLevel: chlorineLevel ? parseFloat(chlorineLevel) : null,
          notes: notes?.trim() || null,
          recordedBy: recordedBy?.trim() || 'Encargado de Piscina'
        }
      });

      res.status(201).json({ success: true, data: log, message: 'Temperatura registrada exitosamente' });
    } catch (error: any) {
      console.error('Error registering pool temperature:', error);
      res.status(500).json({ success: false, message: 'Error registrando temperatura del agua' });
    }
  }

  private async getLatestPoolTemperature(req: Request, res: Response) {
    try {
      const latest = await this.prisma.poolTemperatureLog.findFirst({
        orderBy: { recordedAt: 'desc' }
      });

      const now = new Date();
      let diffMinutes = null;
      let needsCheck = true;

      if (latest) {
        diffMinutes = Math.floor((now.getTime() - new Date(latest.recordedAt).getTime()) / (1000 * 60));
        needsCheck = diffMinutes >= 120; // 2 hours
      }

      res.status(200).json({
        success: true,
        data: {
          latest: latest || {
            temperature: 28.0,
            recordedAt: null,
            notes: 'Sin mediciones recientes'
          },
          diffMinutes,
          needsCheck
        }
      });
    } catch (error: any) {
      console.error('Error fetching latest pool temperature:', error);
      res.status(500).json({ success: false, message: 'Error al consultar temperatura del agua' });
    }
  }

  private async getPoolTemperatureHistory(req: Request, res: Response) {
    try {
      const history = await this.prisma.poolTemperatureLog.findMany({
        take: 50,
        orderBy: { recordedAt: 'desc' }
      });

      res.status(200).json({ success: true, data: history });
    } catch (error: any) {
      console.error('Error fetching pool temperature history:', error);
      res.status(500).json({ success: false, message: 'Error al consultar historial de temperaturas' });
    }
  }
}
