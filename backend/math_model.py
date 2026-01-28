import gurobipy as gp
from gurobipy import GRB
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
    # Sets (Dynamic from DB via API)
    # =====================
    I = list(zones.keys())

    # Dynamic K from centers parameter (fallback for backward compatibility)
    if centers and len(centers) > 0:
        K = [c["id"] for c in centers]
    else:
        K = ["K1"]  # Fallback

    J = ["knife", "rake", "blower", "torch"]

    # =====================
    # Parameters (Dynamic from DB)
    # =====================
    Area = zones

    # Dynamic Staff from centers parameter
    if centers and len(centers) > 0:
        Staff = {c["id"]: c.get("staff_count", 0) for c in centers}
        TravelTime = {
            (c["id"], i): c.get("travel_time_min", 30) for c in centers for i in I
        }
    else:
        # Fallback for backward compatibility
        Staff = {"K1": 21}
        TravelTime = {(k, i): 30 for k in K for i in I}

    TeamSize = 7
    P_team = 4000 / 30.0

    # Calculate N_max from actual staff counts
    N_max = sum(Staff[k] // TeamSize for k in K)
    T_max = 300

    # =====================
    # Debug Logging
    # =====================
    print("=== Math Model Debug ===")
    print(f"Centers (K): {K}")
    print(f"Staff: {Staff}")
    print(f"TravelTime sample: {list(TravelTime.items())[:3]}")
    print(f"TeamSize: {TeamSize}")
    print(f"N_max (total teams available): {N_max}")
    print(f"Zones: {I}")
    print(f"Areas: {Area}")
    print("========================")

    # =====================
    # Edge Case: No teams available
    # =====================
    if N_max == 0:
        print("WARNING: N_max = 0, no teams can be deployed")
        return {
            "zones": {
                i: {
                    "do": 0,
                    "teams": 0,
                    "time": 0.0,
                    "unfinished_area": Area[i],
                }
                for i in I
            },
        }

    M_range = range(N_max + 1)
    M = max(Area.values()) if Area.values() else 0

    # =====================
    # Model
    # =====================
    model = gp.Model("Firebreak_MultiObjective_API")
    model.setParam("OutputFlag", 0)

    # =====================
    # Variables
    # =====================
    x = model.addVars(I, K, vtype=GRB.INTEGER, lb=0)
    y = model.addVars(I, K, vtype=GRB.BINARY)
    n = model.addVars(I, vtype=GRB.INTEGER, lb=0, ub=N_max)
    t = model.addVars(I, vtype=GRB.CONTINUOUS, lb=0, ub=T_max)
    A_uncomp = model.addVars(I, vtype=GRB.CONTINUOUS, lb=0)
    do = model.addVars(I, vtype=GRB.BINARY)

    d = model.addVars(I, M_range, vtype=GRB.BINARY)
    tau = model.addVars(I, M_range, vtype=GRB.CONTINUOUS, lb=0)
    z = model.addVars(I, vtype=GRB.CONTINUOUS, lb=0)

    # =====================
    # Constraints
    # =====================
    for i in I:
        model.addConstr(n[i] == gp.quicksum(x[i, k] for k in K))
        model.addConstr(n[i] >= do[i])
        model.addConstr(n[i] <= N_max * do[i])
        model.addConstr(t[i] <= T_max * do[i])

        model.addConstr(A_uncomp[i] <= M * (1 - do[i]))
        model.addConstr(A_uncomp[i] >= Area[i] * (1 - do[i]))

        model.addConstr(gp.quicksum(d[i, m] for m in M_range) == 1)
        model.addConstr(n[i] == gp.quicksum(m * d[i, m] for m in M_range))

        for m in M_range:
            model.addConstr(tau[i, m] <= T_max * d[i, m])
            model.addConstr(tau[i, m] <= t[i])
            model.addConstr(tau[i, m] >= t[i] - T_max * (1 - d[i, m]))

        model.addConstr(t[i] == gp.quicksum(tau[i, m] for m in M_range))
        model.addConstr(z[i] == gp.quicksum(m * tau[i, m] for m in M_range))

        model.addConstr(P_team * z[i] + A_uncomp[i] == Area[i])

        for k in K:
            model.addConstr(x[i, k] <= N_max * y[i, k])
            model.addConstr(x[i, k] <= N_max * do[i])
            model.addConstr(y[i, k] <= do[i])

    model.addConstr(gp.quicksum(do[i] for i in I) <= N_max)

    # =====================
    # Objectives
    # =====================

    # Z1: เวลาเดินทางรวม + เวลาทำงาน
    Z1 = gp.quicksum(TravelTime[(k, i)] * y[i, k] for i in I for k in K) + gp.quicksum(
        t[i] for i in I
    )

    # Z2: พื้นที่แนวกันไฟที่ยังไม่เสร็จ
    Z2 = gp.quicksum(A_uncomp[i] for i in I)

    # =====================
    # Step 1: Minimize Z1
    # =====================
    model.setObjective(Z1, GRB.MINIMIZE)
    model.optimize()

    if model.status != GRB.OPTIMAL:
        raise RuntimeError("Step 1 optimization failed")

    Z1_opt = Z1.getValue()
    Z2_at_Z1 = Z2.getValue()

    # =====================
    # Step 2: Minimize Z2
    # =====================
    model.setObjective(Z2, GRB.MINIMIZE)
    model.optimize()

    if model.status != GRB.OPTIMAL:
        raise RuntimeError("Step 2 optimization failed")

    Z2_opt = Z2.getValue()
    Z1_at_Z2 = Z1.getValue()

    # =====================
    # Step 3: Weighted Normalized
    # =====================
    Z1U, Z1N = Z1_opt, Z1_at_Z2
    Z2U, Z2N = Z2_opt, Z2_at_Z1

    # ป้องกันหาร 0
    eps = 1e-6

    UZ1 = (Z1 - Z1U) / (Z1N - Z1U + eps)
    UZ2 = (Z2 - Z2U) / (Z2N - Z2U + eps)

    Z = 0.5 * UZ1 + 0.5 * UZ2

    model.setObjective(Z, GRB.MINIMIZE)
    model.optimize()

    if model.status != GRB.OPTIMAL:
        raise RuntimeError("Final optimization failed")

    # =====================
    # Debug: Log results
    # =====================
    print("=== Optimization Results ===")
    for i in I:
        print(f"Zone {i}: do={int(do[i].X)}, teams={int(n[i].X)}, time={t[i].X:.2f}")
    print("============================")

    # =====================
    # Result (JSON)
    # =====================
    return {
        "zones": {
            i: {
                "do": int(do[i].X),
                "teams": int(n[i].X),
                "time": round(t[i].X, 2),
                "unfinished_area": round(A_uncomp[i].X, 2),
            }
            for i in I
        },
    }
