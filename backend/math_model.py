from pyomo.environ import *
from typing import List, Dict, Any


def run_math_model(zones: dict, centers: List[Dict[str, Any]] = None) -> dict:
    """
    zones = {
        "A": area_A,
        "B": area_B,
        ...
    }
    centers = [
        {
            "id": "K1",
            "name": "K1",
            "staff_count": 21,
            "travel_time_min": 30,
            "equipment": {"knife": 10, "rake": 5, ...}
        },
        ...
    ]
    """

    # =====================
    # Sets
    # =====================
    I = list(zones.keys())

    if centers and len(centers) > 0:
        K = [c["id"] for c in centers]
    else:
        K = ["K1"]

    Area = zones

    if centers and len(centers) > 0:
        Staff = {c["id"]: c.get("staff_count", 0) for c in centers}
        TravelTime = {
            (c["id"], i): c.get("travel_time_min", 30) for c in centers for i in I
        }
    else:
        Staff = {"K1": 21}
        TravelTime = {(k, i): 30 for k in K for i in I}

    TeamSize = 7
    P_team = 4000 / 30.0

    N_max = sum(Staff[k] // TeamSize for k in K)
    T_max = 300
    M = max(Area.values()) if Area else 0

    if N_max == 0:
        return {
            "zones": {
                i: {
                    "do": 0,
                    "teams": 0,
                    "time": 0.0,
                    "unfinished_area": Area[i],
                }
                for i in I
            }
        }

    M_range = range(N_max + 1)

    # =====================
    # Model
    # =====================
    model = ConcreteModel()

    model.I = Set(initialize=I)
    model.K = Set(initialize=K)
    model.M = Set(initialize=M_range)

    # =====================
    # Variables
    # =====================
    model.x = Var(model.I, model.K, domain=NonNegativeIntegers)
    model.y = Var(model.I, model.K, domain=Binary)
    model.n = Var(model.I, domain=NonNegativeIntegers, bounds=(0, N_max))
    model.t = Var(model.I, domain=NonNegativeReals, bounds=(0, T_max))
    model.A_uncomp = Var(model.I, domain=NonNegativeReals)
    model.do = Var(model.I, domain=Binary)

    model.d = Var(model.I, model.M, domain=Binary)
    model.tau = Var(model.I, model.M, domain=NonNegativeReals, bounds=(0, T_max))
    model.z = Var(model.I, domain=NonNegativeReals)

    # =====================
    # Constraints
    # =====================
    def team_sum_rule(m, i):
        return m.n[i] == sum(m.x[i, k] for k in m.K)

    model.team_sum = Constraint(model.I, rule=team_sum_rule)

    def do_lower_rule(m, i):
        return m.n[i] >= m.do[i]

    def do_upper_rule(m, i):
        return m.n[i] <= N_max * m.do[i]

    def time_do_rule(m, i):
        return m.t[i] <= T_max * m.do[i]

    model.do_lower = Constraint(model.I, rule=do_lower_rule)
    model.do_upper = Constraint(model.I, rule=do_upper_rule)
    model.time_do = Constraint(model.I, rule=time_do_rule)

    def uncomp_upper_rule(m, i):
        return m.A_uncomp[i] <= M * (1 - m.do[i])

    def uncomp_lower_rule(m, i):
        return m.A_uncomp[i] >= Area[i] * (1 - m.do[i])

    model.uncomp_upper = Constraint(model.I, rule=uncomp_upper_rule)
    model.uncomp_lower = Constraint(model.I, rule=uncomp_lower_rule)

    def d_sum_rule(m, i):
        return sum(m.d[i, mm] for mm in m.M) == 1

    def n_def_rule(m, i):
        return m.n[i] == sum(mm * m.d[i, mm] for mm in m.M)

    model.d_sum = Constraint(model.I, rule=d_sum_rule)
    model.n_def = Constraint(model.I, rule=n_def_rule)

    def tau_upper1(m, i, mm):
        return m.tau[i, mm] <= T_max * m.d[i, mm]

    def tau_upper2(m, i, mm):
        return m.tau[i, mm] <= m.t[i]

    def tau_lower(m, i, mm):
        return m.tau[i, mm] >= m.t[i] - T_max * (1 - m.d[i, mm])

    model.tau_u1 = Constraint(model.I, model.M, rule=tau_upper1)
    model.tau_u2 = Constraint(model.I, model.M, rule=tau_upper2)
    model.tau_l = Constraint(model.I, model.M, rule=tau_lower)

    def t_def_rule(m, i):
        return m.t[i] == sum(m.tau[i, mm] for mm in m.M)

    def z_def_rule(m, i):
        return m.z[i] == sum(mm * m.tau[i, mm] for mm in m.M)

    model.t_def = Constraint(model.I, rule=t_def_rule)
    model.z_def = Constraint(model.I, rule=z_def_rule)

    def area_balance_rule(m, i):
        return P_team * m.z[i] + m.A_uncomp[i] == Area[i]

    model.area_balance = Constraint(model.I, rule=area_balance_rule)

    def link_x_y_rule(m, i, k):
        return m.x[i, k] <= N_max * m.y[i, k]

    def link_x_do_rule(m, i, k):
        return m.x[i, k] <= N_max * m.do[i]

    def link_y_do_rule(m, i, k):
        return m.y[i, k] <= m.do[i]

    model.link_x_y = Constraint(model.I, model.K, rule=link_x_y_rule)
    model.link_x_do = Constraint(model.I, model.K, rule=link_x_do_rule)
    model.link_y_do = Constraint(model.I, model.K, rule=link_y_do_rule)

    def total_do_rule(m):
        return sum(m.do[i] for i in m.I) <= N_max

    model.total_do = Constraint(rule=total_do_rule)

    # =====================
    # Objectives
    # =====================
    model.Z1 = Expression(
        expr=sum(TravelTime[(k, i)] * model.y[i, k] for i in I for k in K)
        + sum(model.t[i] for i in I)
    )

    model.Z2 = Expression(expr=sum(model.A_uncomp[i] for i in I))

    solver = SolverFactory("highs")

    # Step 1: Min Z1
    model.obj1 = Objective(expr=model.Z1, sense=minimize)
    solver.solve(model)
    Z1_opt = value(model.Z1)
    Z2_at_Z1 = value(model.Z2)
    model.obj1.deactivate()

    # Step 2: Min Z2
    model.obj2 = Objective(expr=model.Z2, sense=minimize)
    solver.solve(model)
    Z2_opt = value(model.Z2)
    Z1_at_Z2 = value(model.Z1)
    model.obj2.deactivate()

    # Step 3: Weighted normalized
    eps = 1e-6
    model.Z = Expression(
        expr=0.5 * (model.Z1 - Z1_opt) / (Z1_at_Z2 - Z1_opt + eps)
        + 0.5 * (model.Z2 - Z2_opt) / (Z2_at_Z1 - Z2_opt + eps)
    )

    model.obj = Objective(expr=model.Z, sense=minimize)
    solver.solve(model)

    # =====================
    # Result
    # =====================
    return {
        "zones": {
            i: {
                "do": int(value(model.do[i])),
                "teams": int(value(model.n[i])),
                "time": round(value(model.t[i]), 2),
                "unfinished_area": round(value(model.A_uncomp[i]), 2),
            }
            for i in I
        }
    }
