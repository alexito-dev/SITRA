"""Consultas SQL a la base de datos bdtvmediasunat."""

# Obtiene los tickets pendientes de atención para el día actual
ESPERA = """
SELECT
    t.id_ticket,
    CASE 
        WHEN t.orden IS NOT NULL AND t.orden > 0 
        THEN ISNULL(k.codigo_impresion, '') + CONVERT(varchar(5), t.orden)
        ELSE ISNULL(k.codigo_impresion, ISNULL(k.nombre, 'TKT-' + CONVERT(varchar(10), t.id_ticket)))
    END AS num_ticket,
    t.nombre_cliente,
    CONVERT(varchar(8), t.hora_emision, 108)               AS hora_emision,
    CASE 
        WHEN DATEDIFF(SECOND, CAST(CONVERT(varchar(8), t.hora_emision, 108) AS datetime), CAST(CONVERT(varchar(8), GETDATE(), 108) AS datetime)) > 0 
        THEN DATEDIFF(SECOND, CAST(CONVERT(varchar(8), t.hora_emision, 108) AS datetime), CAST(CONVERT(varchar(8), GETDATE(), 108) AS datetime))
        ELSE 0 
    END AS segundos,
    t.ruc
FROM ticket t
JOIN tipo_ticket   k ON t.id_tipo_ticket = k.id_tipo_ticket
JOIN estado_ticket e ON t.id_estado      = e.id_estado
WHERE t.id_estado IN ('0', '1')
  AND CONVERT(varchar(10), t.fecha, 103) = CONVERT(varchar(10), GETDATE(), 103)
ORDER BY t.hora_emision
"""

# Obtiene los tickets que están siendo atendidos actualmente en ventanilla
ATENCION = """
SELECT
    t.id_ticket,
    CASE 
        WHEN t.orden IS NOT NULL AND t.orden > 0 
        THEN ISNULL(k.codigo_impresion, '') + CONVERT(varchar(5), t.orden)
        ELSE ISNULL(k.codigo_impresion, ISNULL(k.nombre, 'TKT-' + CONVERT(varchar(10), t.id_ticket)))
    END AS num_ticket,
    t.id_ventanilla                                        AS num_ventanilla,
    ISNULL(UPPER(u.nombre), '—')                           AS funcionario,
    t.nombre_cliente,
    CONVERT(varchar(8), t.hora_inicio_atencion, 108)       AS hora_inicio,
    CASE 
        WHEN DATEDIFF(SECOND, CAST(CONVERT(varchar(8), t.hora_inicio_atencion, 108) AS datetime), CAST(CONVERT(varchar(8), GETDATE(), 108) AS datetime)) > 0 
        THEN DATEDIFF(SECOND, CAST(CONVERT(varchar(8), t.hora_inicio_atencion, 108) AS datetime), CAST(CONVERT(varchar(8), GETDATE(), 108) AS datetime))
        ELSE 0 
    END AS segundos,
    t.ruc
FROM ticket t
JOIN tipo_ticket        k ON t.id_tipo_ticket = k.id_tipo_ticket
JOIN estado_ticket      e ON t.id_estado      = e.id_estado
LEFT JOIN usuario       u ON t.id_usuario     = u.id_usuario
WHERE t.id_estado = '2'
  AND CONVERT(varchar(10), t.fecha, 103) = CONVERT(varchar(10), GETDATE(), 103)
ORDER BY t.hora_inicio_atencion
"""

# Obtiene las ventanillas que se encuentran temporalmente suspendidas
SUSPENSION = """
SELECT
    UPPER(u.nombre)                                    AS funcionario,
    UPPER(m.nombre)                                    AS motivo,
    CONVERT(varchar(8), s.horainicio, 108)             AS inicio,
    CASE 
        WHEN DATEDIFF(SECOND, CAST(CONVERT(varchar(8), s.horainicio, 108) AS datetime), CAST(CONVERT(varchar(8), GETDATE(), 108) AS datetime)) > 0 
        THEN DATEDIFF(SECOND, CAST(CONVERT(varchar(8), s.horainicio, 108) AS datetime), CAST(CONVERT(varchar(8), GETDATE(), 108) AS datetime))
        ELSE 0 
    END AS segundos
FROM sucesos_motivo_suspender s
JOIN motivo_suspender m ON s.id_motivo_suspender = m.id_motivo_suspender
JOIN usuario          u ON s.id_usuario          = u.id_usuario
WHERE CONVERT(varchar(10), s.fecha, 103) = CONVERT(varchar(10), GETDATE(), 103)
  AND s.horafin IS NULL
  AND s.id_sucesos_motivo_suspender IN (
        SELECT MAX(b.id_sucesos_motivo_suspender)
        FROM sucesos_motivo_suspender b
        WHERE CONVERT(varchar(10), b.fecha, 103) = CONVERT(varchar(10), GETDATE(), 103)
        GROUP BY b.id_usuario
  )
ORDER BY s.horainicio
"""

# Calcula la cantidad de atenciones y el tiempo promedio por gestor
PRODUCCION = """
SELECT
    UPPER(u.nombre)                                                    AS funcionario,
    COUNT(*)                                                           AS atenciones,
    AVG(CASE 
        WHEN t.hora_inicio_atencion IS NOT NULL AND t.hora_fin_atencion IS NOT NULL 
             AND DATEDIFF(SECOND, CAST(CONVERT(varchar(8), t.hora_inicio_atencion, 108) AS datetime), CAST(CONVERT(varchar(8), t.hora_fin_atencion, 108) AS datetime)) >= 0 
        THEN DATEDIFF(SECOND, CAST(CONVERT(varchar(8), t.hora_inicio_atencion, 108) AS datetime), CAST(CONVERT(varchar(8), t.hora_fin_atencion, 108) AS datetime))
        ELSE 0 
    END) AS prom_segundos
FROM ticket t
JOIN usuario u ON t.id_usuario = u.id_usuario
WHERE t.id_estado IN ('3', '4')
  AND t.hora_fin_atencion IS NOT NULL
  AND CONVERT(varchar(10), t.fecha, 103) = CONVERT(varchar(10), GETDATE(), 103)
GROUP BY u.nombre
ORDER BY COUNT(*) DESC
"""

# Obtiene la cantidad de tickets emitidos por bloques de 30 minutos del día actual (Card 1 - Histograma)
DEMANDA = """
SELECT
    hora,
    minuto,
    RIGHT('0' + CAST(hora AS varchar(2)), 2) + ':' + CASE WHEN minuto = 30 THEN '30' ELSE '00' END AS intervalo,
    emitidos
FROM (
    SELECT
        DATEPART(HOUR, CAST(CONVERT(varchar(8), t.hora_emision, 108) AS datetime)) AS hora,
        CASE WHEN DATEPART(MINUTE, CAST(CONVERT(varchar(8), t.hora_emision, 108) AS datetime)) >= 30 THEN 30 ELSE 0 END AS minuto,
        COUNT(*) AS emitidos
    FROM ticket t
    WHERE CONVERT(varchar(10), t.fecha, 103) = CONVERT(varchar(10), GETDATE(), 103)
      AND t.hora_emision IS NOT NULL
      AND LEN(RTRIM(LTRIM(CONVERT(varchar(8), t.hora_emision, 108)))) >= 5
    GROUP BY 
        DATEPART(HOUR, CAST(CONVERT(varchar(8), t.hora_emision, 108) AS datetime)),
        CASE WHEN DATEPART(MINUTE, CAST(CONVERT(varchar(8), t.hora_emision, 108) AS datetime)) >= 30 THEN 30 ELSE 0 END
) sub
ORDER BY hora, minuto
"""

# Curva de Flujo Horario acumulado por bloques de 30 min del día actual y promedio de atención diario (Card 2 - Flujo)
FLUJO_DIA = """
SELECT 
    hora,
    minuto,
    RIGHT('0' + CAST(hora AS varchar(2)), 2) + ':' + CASE WHEN minuto = 30 THEN '30' ELSE '00' END AS intervalo,
    flujo,
    CAST(promedio_seg / 60.0 AS DECIMAL(10,2)) AS promedio_hora,
    (SELECT CAST(AVG(CASE 
        WHEN tk2.hora_inicio_atencion IS NOT NULL AND tk2.hora_fin_atencion IS NOT NULL 
             AND DATEDIFF(SECOND, CAST(CONVERT(varchar(8), tk2.hora_inicio_atencion, 108) AS datetime), CAST(CONVERT(varchar(8), tk2.hora_fin_atencion, 108) AS datetime)) >= 0 
        THEN DATEDIFF(SECOND, CAST(CONVERT(varchar(8), tk2.hora_inicio_atencion, 108) AS datetime), CAST(CONVERT(varchar(8), tk2.hora_fin_atencion, 108) AS datetime))
        ELSE NULL 
     END) / 60.0 AS DECIMAL(10,2))
     FROM ticket tk2
     WHERE CONVERT(varchar(10), tk2.fecha, 103) = CONVERT(varchar(10), GETDATE(), 103)
       AND tk2.hora_fin_atencion IS NOT NULL
       AND tk2.hora_inicio_atencion IS NOT NULL) AS promedio_dia
FROM (
    SELECT 
        DATEPART(HOUR, CAST(CONVERT(varchar(8), tk.hora_inicio_atencion, 108) AS datetime)) AS hora,
        CASE WHEN DATEPART(MINUTE, CAST(CONVERT(varchar(8), tk.hora_inicio_atencion, 108) AS datetime)) >= 30 THEN 30 ELSE 0 END AS minuto,
        COUNT(tk.id_ticket) AS flujo,
        AVG(CASE 
            WHEN tk.hora_inicio_atencion IS NOT NULL AND tk.hora_fin_atencion IS NOT NULL 
                 AND DATEDIFF(SECOND, CAST(CONVERT(varchar(8), tk.hora_inicio_atencion, 108) AS datetime), CAST(CONVERT(varchar(8), tk.hora_fin_atencion, 108) AS datetime)) >= 0 
            THEN DATEDIFF(SECOND, CAST(CONVERT(varchar(8), tk.hora_inicio_atencion, 108) AS datetime), CAST(CONVERT(varchar(8), tk.hora_fin_atencion, 108) AS datetime))
            ELSE 0 
        END) AS promedio_seg
    FROM ticket tk
    WHERE CONVERT(varchar(10), tk.fecha, 103) = CONVERT(varchar(10), GETDATE(), 103)
      AND tk.hora_fin_atencion IS NOT NULL
      AND tk.hora_inicio_atencion IS NOT NULL
      AND LEN(RTRIM(LTRIM(CONVERT(varchar(8), tk.hora_inicio_atencion, 108)))) >= 5
    GROUP BY 
        DATEPART(HOUR, CAST(CONVERT(varchar(8), tk.hora_inicio_atencion, 108) AS datetime)),
        CASE WHEN DATEPART(MINUTE, CAST(CONVERT(varchar(8), tk.hora_inicio_atencion, 108) AS datetime)) >= 30 THEN 30 ELSE 0 END
) sub
ORDER BY hora, minuto
"""

# Curva de Flujo Horario acumulado por bloques de 30 min del mes en curso y promedio de atención mensual (Card 2 - Flujo)
FLUJO_MES = """
SELECT 
    hora,
    minuto,
    RIGHT('0' + CAST(hora AS varchar(2)), 2) + ':' + CASE WHEN minuto = 30 THEN '30' ELSE '00' END AS intervalo,
    flujo,
    CAST(promedio_seg / 60.0 AS DECIMAL(10,2)) AS promedio_hora,
    (SELECT CAST(AVG(CASE 
        WHEN tk2.hora_inicio_atencion IS NOT NULL AND tk2.hora_fin_atencion IS NOT NULL 
             AND DATEDIFF(SECOND, CAST(CONVERT(varchar(8), tk2.hora_inicio_atencion, 108) AS datetime), CAST(CONVERT(varchar(8), tk2.hora_fin_atencion, 108) AS datetime)) >= 0 
        THEN DATEDIFF(SECOND, CAST(CONVERT(varchar(8), tk2.hora_inicio_atencion, 108) AS datetime), CAST(CONVERT(varchar(8), tk2.hora_fin_atencion, 108) AS datetime))
        ELSE NULL 
     END) / 60.0 AS DECIMAL(10,2))
     FROM ticket tk2
     WHERE SUBSTRING(CONVERT(varchar(10), tk2.fecha, 103), 4, 7) = SUBSTRING(CONVERT(varchar(10), GETDATE(), 103), 4, 7)
       AND tk2.hora_fin_atencion IS NOT NULL
       AND tk2.hora_inicio_atencion IS NOT NULL) AS promedio_mes
FROM (
    SELECT 
        DATEPART(HOUR, CAST(CONVERT(varchar(8), tk.hora_inicio_atencion, 108) AS datetime)) AS hora,
        CASE WHEN DATEPART(MINUTE, CAST(CONVERT(varchar(8), tk.hora_inicio_atencion, 108) AS datetime)) >= 30 THEN 30 ELSE 0 END AS minuto,
        COUNT(tk.id_ticket) AS flujo,
        AVG(CASE 
            WHEN tk.hora_inicio_atencion IS NOT NULL AND tk.hora_fin_atencion IS NOT NULL 
                 AND DATEDIFF(SECOND, CAST(CONVERT(varchar(8), tk.hora_inicio_atencion, 108) AS datetime), CAST(CONVERT(varchar(8), tk.hora_fin_atencion, 108) AS datetime)) >= 0 
            THEN DATEDIFF(SECOND, CAST(CONVERT(varchar(8), tk.hora_inicio_atencion, 108) AS datetime), CAST(CONVERT(varchar(8), tk.hora_fin_atencion, 108) AS datetime))
            ELSE 0 
        END) AS promedio_seg
    FROM ticket tk
    WHERE SUBSTRING(CONVERT(varchar(10), tk.fecha, 103), 4, 7) = SUBSTRING(CONVERT(varchar(10), GETDATE(), 103), 4, 7)
      AND tk.hora_fin_atencion IS NOT NULL
      AND tk.hora_inicio_atencion IS NOT NULL
      AND LEN(RTRIM(LTRIM(CONVERT(varchar(8), tk.hora_inicio_atencion, 108)))) >= 5
    GROUP BY 
        DATEPART(HOUR, CAST(CONVERT(varchar(8), tk.hora_inicio_atencion, 108) AS datetime)),
        CASE WHEN DATEPART(MINUTE, CAST(CONVERT(varchar(8), tk.hora_inicio_atencion, 108) AS datetime)) >= 30 THEN 30 ELSE 0 END
) sub
ORDER BY hora, minuto
"""

# Calcula la cantidad de atenciones y el tiempo promedio por tipo de ticket (Orientación, Trámite, Mesa de Partes, Cabinas)
PRODUCCION_TIPO = """
SELECT
    k.id_tipo_ticket,
    UPPER(k.nombre)                                                    AS nombre_tipo,
    UPPER(k.codigo_impresion)                                          AS codigo_impresion,
    COUNT(*)                                                           AS atenciones,
    AVG(CASE 
        WHEN t.hora_inicio_atencion IS NOT NULL AND t.hora_fin_atencion IS NOT NULL 
             AND DATEDIFF(SECOND, CAST(CONVERT(varchar(8), t.hora_inicio_atencion, 108) AS datetime), CAST(CONVERT(varchar(8), t.hora_fin_atencion, 108) AS datetime)) >= 0 
        THEN DATEDIFF(SECOND, CAST(CONVERT(varchar(8), t.hora_inicio_atencion, 108) AS datetime), CAST(CONVERT(varchar(8), t.hora_fin_atencion, 108) AS datetime))
        ELSE 0 
    END) AS prom_segundos
FROM ticket t
JOIN tipo_ticket k ON t.id_tipo_ticket = k.id_tipo_ticket
WHERE (
    t.id_estado IN ('3', '4')
    OR (t.id_tipo_ticket IN (14, 15, 16) AND t.hora_fin_atencion IS NOT NULL)
)
  AND t.hora_fin_atencion IS NOT NULL
  AND CONVERT(varchar(10), t.fecha, 103) = CONVERT(varchar(10), GETDATE(), 103)
GROUP BY k.id_tipo_ticket, k.nombre, k.codigo_impresion
ORDER BY k.id_tipo_ticket
"""

# Consulta de respaldo agrupada únicamente por código de impresión si una sede no tiene columna 'nombre'
PRODUCCION_TIPO_FALLBACK = """
SELECT
    UPPER(k.codigo_impresion)                                          AS codigo_impresion,
    COUNT(*)                                                           AS atenciones,
    AVG(CASE 
        WHEN t.hora_inicio_atencion IS NOT NULL AND t.hora_fin_atencion IS NOT NULL 
             AND DATEDIFF(SECOND, CAST(CONVERT(varchar(8), t.hora_inicio_atencion, 108) AS datetime), CAST(CONVERT(varchar(8), t.hora_fin_atencion, 108) AS datetime)) >= 0 
        THEN DATEDIFF(SECOND, CAST(CONVERT(varchar(8), t.hora_inicio_atencion, 108) AS datetime), CAST(CONVERT(varchar(8), t.hora_fin_atencion, 108) AS datetime))
        ELSE 0 
    END) AS prom_segundos
FROM ticket t
JOIN tipo_ticket k ON t.id_tipo_ticket = k.id_tipo_ticket
WHERE (
    t.id_estado IN ('3', '4')
    OR (t.id_tipo_ticket IN (14, 15, 16) AND t.hora_fin_atencion IS NOT NULL)
)
  AND t.hora_fin_atencion IS NOT NULL
  AND CONVERT(varchar(10), t.fecha, 103) = CONVERT(varchar(10), GETDATE(), 103)
GROUP BY k.codigo_impresion
"""

# Métricas globales de calidad y BSC del día: total tickets evaluados TEM (excluye abandonos/no atendidos), espera <= 15 min y tiempo de atención promedio
KPIS_DIA = """
SELECT
    ISNULL(SUM(CASE 
        WHEN t.hora_inicio_atencion IS NOT NULL AND t.hora_emision IS NOT NULL THEN 1
        WHEN t.id_estado IN ('0', '1') AND t.hora_emision IS NOT NULL THEN 1
        ELSE 0
    END), 0) AS total_tickets,
    ISNULL(SUM(CASE 
        WHEN t.hora_inicio_atencion IS NOT NULL AND t.hora_emision IS NOT NULL 
             AND DATEDIFF(SECOND, CAST(CONVERT(varchar(8), t.hora_emision, 108) AS datetime), CAST(CONVERT(varchar(8), t.hora_inicio_atencion, 108) AS datetime)) <= 900
        THEN 1
        WHEN t.id_estado IN ('0', '1') AND t.hora_emision IS NOT NULL
             AND DATEDIFF(SECOND, CAST(CONVERT(varchar(8), t.hora_emision, 108) AS datetime), CAST(CONVERT(varchar(8), GETDATE(), 108) AS datetime)) <= 900
        THEN 1
        ELSE 0
    END), 0) AS espera_menor_15m,
    AVG(CASE 
        WHEN t.id_estado IN ('3', '4') AND t.hora_inicio_atencion IS NOT NULL AND t.hora_fin_atencion IS NOT NULL 
             AND DATEDIFF(SECOND, CAST(CONVERT(varchar(8), t.hora_inicio_atencion, 108) AS datetime), CAST(CONVERT(varchar(8), t.hora_fin_atencion, 108) AS datetime)) >= 0 
        THEN DATEDIFF(SECOND, CAST(CONVERT(varchar(8), t.hora_inicio_atencion, 108) AS datetime), CAST(CONVERT(varchar(8), t.hora_fin_atencion, 108) AS datetime))
        ELSE NULL
    END) AS prom_atencion_segundos
FROM ticket t
WHERE CONVERT(varchar(10), t.fecha, 103) = CONVERT(varchar(10), GETDATE(), 103)
  AND t.hora_emision IS NOT NULL
"""

# Obtiene el listado completo y detallado de tickets para una fecha específica (Reporte Diario)
REPORTE_DIA = """
SELECT
    t.id_ticket,
    ISNULL(k.codigo_impresion, '') + CONVERT(varchar(5), t.orden)      AS num_ticket,
    ISNULL(UPPER(k.nombre), 'GENERAL')                                 AS tipo_ticket,
    ISNULL(UPPER(k.codigo_impresion), '')                              AS codigo_impresion,
    t.id_ventanilla                                                    AS num_ventanilla,
    ISNULL(UPPER(u.nombre), '—')                                       AS funcionario,
    ISNULL(t.nombre_cliente, '—')                                      AS nombre_cliente,
    ISNULL(t.ruc, '')                                                  AS ruc,
    CONVERT(varchar(8), t.hora_emision, 108)                           AS hora_emision,
    CONVERT(varchar(8), t.hora_inicio_atencion, 108)                   AS hora_inicio,
    CONVERT(varchar(8), t.hora_fin_atencion, 108)                      AS hora_fin,
    CASE 
        WHEN t.hora_inicio_atencion IS NOT NULL AND t.hora_emision IS NOT NULL
             AND DATEDIFF(SECOND, CAST(CONVERT(varchar(8), t.hora_emision, 108) AS datetime), CAST(CONVERT(varchar(8), t.hora_inicio_atencion, 108) AS datetime)) >= 0
        THEN DATEDIFF(SECOND, CAST(CONVERT(varchar(8), t.hora_emision, 108) AS datetime), CAST(CONVERT(varchar(8), t.hora_inicio_atencion, 108) AS datetime))
        WHEN t.id_estado IN ('0', '1') AND t.hora_emision IS NOT NULL
             AND DATEDIFF(SECOND, CAST(CONVERT(varchar(8), t.hora_emision, 108) AS datetime), CAST(CONVERT(varchar(8), GETDATE(), 108) AS datetime)) >= 0
        THEN DATEDIFF(SECOND, CAST(CONVERT(varchar(8), t.hora_emision, 108) AS datetime), CAST(CONVERT(varchar(8), GETDATE(), 108) AS datetime))
        ELSE 0
    END AS espera_segundos,
    CASE 
        WHEN t.hora_fin_atencion IS NOT NULL AND t.hora_inicio_atencion IS NOT NULL
             AND DATEDIFF(SECOND, CAST(CONVERT(varchar(8), t.hora_inicio_atencion, 108) AS datetime), CAST(CONVERT(varchar(8), t.hora_fin_atencion, 108) AS datetime)) >= 0
        THEN DATEDIFF(SECOND, CAST(CONVERT(varchar(8), t.hora_inicio_atencion, 108) AS datetime), CAST(CONVERT(varchar(8), t.hora_fin_atencion, 108) AS datetime))
        ELSE 0
    END AS atencion_segundos,
    ISNULL(e.nombre, 'DESCONOCIDO')                                    AS estado
FROM ticket t
LEFT JOIN tipo_ticket   k ON t.id_tipo_ticket = k.id_tipo_ticket
LEFT JOIN usuario       u ON t.id_usuario     = u.id_usuario
LEFT JOIN estado_ticket e ON t.id_estado      = e.id_estado
WHERE (CONVERT(varchar(10), t.fecha, 120) = '{fecha}' OR CONVERT(varchar(10), t.fecha, 103) = '{fecha}')
ORDER BY t.hora_emision DESC
"""


