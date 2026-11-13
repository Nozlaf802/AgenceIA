#!/usr/bin/env python3
"""
Générateur de la carte « Falaise du Phare » (Lumen, le dernier phare).

Produit, dans le dossier parent :
  - falaise_du_phare.tmj          carte Tiled (JSON), tileset intégré (Phaser 3 n'accepte pas les tilesets externes)
  - tileset_falaise_provisoire.png tileset provisoire 32x32 (couleurs unies), à remplacer par celui du DA
  - apercu_falaise_du_phare.png   plan annoté pour l'équipe

Usage : python3 generer_carte.py   (Python 3.9+, Pillow, numpy)
Le résultat est déterministe : relancer donne exactement la même carte.
"""
import argparse
import json
import math
import os
from collections import deque

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ICI = os.path.dirname(os.path.abspath(__file__))
SORTIE = os.path.dirname(ICI)
RACINE = os.path.dirname(os.path.dirname(SORTIE))

ap = argparse.ArgumentParser(description="Génère la carte Falaise du Phare")
ap.add_argument("--assets", default=os.path.join(RACINE, "public", "assets"),
                help="dossier des assets du DA (contient tiles/tileset_falaise.png et props/)")
ARGS = ap.parse_args()
TILESET_DA = os.path.join(ARGS.assets, "tiles", "tileset_falaise.png")
PROPS_DIR = os.path.join(ARGS.assets, "props")

W, H = 160, 100          # tuiles (5120 x 3200 px = 4 écrans de large, 4,4 de haut)
T = 32                   # taille d'une tuile en px
CX, CY = 80, 50          # centre du phare

# ---------------------------------------------------------------------------
# Contrat de tuiles : l'ID (gid, 1 = première tuile) ne doit pas changer quand
# le DA remplace l'image du tileset. Seul le dessin change.
# ---------------------------------------------------------------------------
TUILES = [
    # gid, nom, collision, couche, couleur provisoire
    (1,  "eau_profonde",   True,  "sol",       (22, 40, 66)),
    (2,  "eau_ecume",      True,  "sol",       (52, 86, 118)),
    (3,  "sable",          False, "sol",       (176, 160, 122)),
    (4,  "herbe",          False, "sol",       (58, 86, 70)),
    (5,  "herbe_sombre",   False, "sol",       (44, 66, 56)),
    (6,  "chemin_terre",   False, "sol",       (110, 92, 70)),
    (7,  "dalles",         False, "sol",       (98, 104, 112)),
    (8,  "falaise",        True,  "sol",       (70, 66, 72)),
    (9,  "planches",       False, "sol",       (120, 88, 56)),
    (10, "fleurs",         False, "deco",      (190, 170, 90)),
    (11, "cailloux",       False, "deco",      (130, 130, 136)),
    (12, "filet_algues",   False, "deco",      (80, 110, 80)),
    (13, "herbe_haute",    False, "deco",      (74, 110, 84)),
    (14, "flaque",         False, "deco",      (60, 90, 110)),
    (15, "os_epave",       False, "deco",      (200, 196, 180)),
    (16, "reserve_deco",   False, "deco",      (255, 0, 255)),
    (17, "rocher_petit",   True,  "obstacles", (120, 116, 124)),
    (18, "rocher_gros",    True,  "obstacles", (96, 92, 100)),
    (19, "mur_ruine",      True,  "obstacles", (140, 132, 118)),
    (20, "menhir",         True,  "obstacles", (150, 150, 160)),
    (21, "barque",         True,  "obstacles", (128, 84, 52)),
    (22, "tronc_pin",      True,  "obstacles", (78, 56, 40)),
    (23, "phare_base",     True,  "obstacles", (210, 206, 196)),
    (24, "caisse",         True,  "obstacles", (150, 112, 64)),
    (25, "brasero",        True,  "obstacles", (230, 140, 50)),
    (26, "feuillage_pin",  False, "dessus",    (34, 72, 54)),
    (27, "phare_haut",     False, "dessus",    (236, 232, 222)),
    (28, "reserve_dessus", False, "dessus",    (255, 0, 255)),
]
# 29-52 : bordures automatiques (proposées par le DA). Ordre dans chaque série :
# n, e, s, o (côtés), ne, se, so, no (coins). La tuile porte le sol de base et une
# frange de la matière voisine du côté indiqué.
DIRS = ["n", "e", "s", "o", "ne", "se", "so", "no"]
BORDURES = [  # (préfixe, gid de base, gid de la frange, couleur provisoire de la frange)
    ("herbe_sable", 4, 3, (176, 160, 122)),
    ("herbe_chemin", 4, 6, (110, 92, 70)),
    ("sable_ecume", 3, 2, (52, 86, 118)),
]
_gid = 29
for pre, base, frange, col in BORDURES:
    for d in DIRS:
        TUILES.append((_gid, f"{pre}_{d}", False, "sol", col))
        _gid += 1
TUILES += [
    (53, "collision_invisible", True,  "obstacles", (0, 0, 0)),
    (54, "reserve_54",          False, "sol",       (255, 0, 255)),
    (55, "reserve_55",          False, "sol",       (255, 0, 255)),
    (56, "reserve_56",          False, "sol",       (255, 0, 255)),
]
G = {nom: gid for gid, nom, *_ in TUILES}
COLLIDE = {gid for gid, _, c, *_ in TUILES if c}

sol = np.full((H, W), G["herbe"], dtype=np.int32)
deco = np.zeros((H, W), dtype=np.int32)
obs = np.zeros((H, W), dtype=np.int32)
dessus = np.zeros((H, W), dtype=np.int32)

rng = np.random.default_rng(802)  # graine fixe


def bruit(a, freq, amp, phase):
    return amp * math.sin(a * freq + phase)


# ---------------------------------------------------------------------------
# 1. Île : côte irrégulière, mer tout autour
# ---------------------------------------------------------------------------
def rayon_cote(angle):
    # ellipse de base + ondulations : demi-axes ~72 x 44 tuiles
    r = 1.0 + bruit(angle, 3, 0.05, 0.7) + bruit(angle, 7, 0.025, 2.1) + bruit(angle, 13, 0.012, 4.0)
    return r


ile = np.zeros((H, W), dtype=bool)
for y in range(H):
    for x in range(W):
        dx, dy = (x + 0.5 - CX) / 72.0, (y + 0.5 - CY) / 44.0
        a = math.atan2(dy, dx)
        ile[y, x] = math.hypot(dx, dy) < rayon_cote(a)

sol[~ile] = G["eau_profonde"]
# écume : eau voisine de la terre
for y in range(H):
    for x in range(W):
        if not ile[y, x]:
            if ile[max(0, y - 1):y + 2, max(0, x - 1):x + 2].any():
                sol[y, x] = G["eau_ecume"]


def dist_cote(x, y):
    """distance approx. (en tuiles) jusqu'à la mer"""
    best = 99
    for r in range(1, 8):
        y0, y1, x0, x1 = max(0, y - r), min(H, y + r + 1), max(0, x - r), min(W, x + r + 1)
        if (~ile[y0:y1, x0:x1]).any():
            return r
    return best


# Côte sud = grève de sable (praticable) ; ailleurs = falaise (bloquante)
for y in range(H):
    for x in range(W):
        if not ile[y, x]:
            continue
        d = dist_cote(x, y)
        sud = y > CY + 22
        if sud:
            if d <= 7:
                sol[y, x] = G["sable"]
        else:
            if d <= 2:
                sol[y, x] = G["falaise"]

# herbe sombre en taches (variété visuelle, sans effet de jeu)
for _ in range(70):
    px, py, r = rng.integers(12, W - 12), rng.integers(10, H - 10), rng.integers(2, 6)
    for y in range(py - r, py + r + 1):
        for x in range(px - r, px + r + 1):
            if 0 <= x < W and 0 <= y < H and sol[y, x] == G["herbe"] and (x - px) ** 2 + (y - py) ** 2 <= r * r:
                sol[y, x] = G["herbe_sombre"]


def disque(grille, cx, cy, r, val, seulement_si=None):
    for y in range(int(cy - r - 1), int(cy + r + 2)):
        for x in range(int(cx - r - 1), int(cx + r + 2)):
            if 0 <= x < W and 0 <= y < H and (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r:
                if seulement_si is None or seulement_si(x, y):
                    grille[y, x] = val


def rect(grille, x0, y0, x1, y1, val):
    grille[max(0, y0):min(H, y1 + 1), max(0, x0):min(W, x1 + 1)] = val


terre = lambda x, y: ile[y, x] and sol[y, x] != G["falaise"]

# ---------------------------------------------------------------------------
# 2. Esplanade du phare (centre, arène du boss)
# ---------------------------------------------------------------------------
disque(sol, CX, CY, 15, G["dalles"])
PHARE_R = 2.6  # collision du pied du phare (le sprite du DA fait ~5 tuiles de large à l'échelle 1,25)
disque(obs, CX, CY, PHARE_R, G["phare_base"])
# 4 braseros éteints autour du phare (repères visuels + lumière d'ambiance)
BRASEROS = [(CX - 11, CY - 7), (CX + 10, CY - 7), (CX - 11, CY + 6), (CX + 10, CY + 6)]
for bx, by in BRASEROS:
    obs[by, bx] = G["brasero"]

# ---------------------------------------------------------------------------
# 3. Chemins de terre (tracés AVANT obstacles, puis on dégage les obstacles dessus)
# ---------------------------------------------------------------------------
CHEMINS = []


def chemin(points, largeur=2):
    CHEMINS.append((points, largeur))


chemin([(CX, CY + 15), (CX, CY + 22), (CX - 2, CY + 32), (CX - 4, CY + 40)], 2)      # vers la grève
chemin([(CX, CY - 15), (CX + 2, CY - 22), (CX, CY - 30), (CX - 2, CY - 38)], 2)      # vers les ruines
chemin([(CX - 15, CY), (CX - 25, CY + 2), (CX - 38, CY - 1), (CX - 52, CY + 3)], 2)  # vers le sentier ouest
chemin([(CX + 15, CY), (CX + 26, CY - 2), (CX + 40, CY + 1), (CX + 50, CY + 2)], 2)  # vers la lande est
chemin([(CX - 2, CY - 38), (CX - 30, CY - 30), (CX - 52, CY + 3)], 2)               # ruines -> ouest
chemin([(CX + 50, CY + 2), (CX + 34, CY + 30), (CX - 4, CY + 40)], 2)               # est -> grève


def tracer_chemins():
    for pts, larg in CHEMINS:
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            n = int(max(abs(x1 - x0), abs(y1 - y0)) * 2) + 1
            for i in range(n + 1):
                t = i / n
                x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
                disque(sol, x, y, larg, G["chemin_terre"],
                       seulement_si=lambda a, b: terre(a, b) and sol[b, a] not in (G["dalles"], G["sable"]))
                disque(obs, x, y, larg + 1.5, 0, seulement_si=lambda a, b: obs[b, a] != G["phare_base"])


tracer_chemins()

# ---------------------------------------------------------------------------
# 4. NORD : Ruines du hameau (murs cassés = couloirs)
# ---------------------------------------------------------------------------
MAISONS = [(52, 14, 11, 8), (66, 10, 10, 7), (90, 11, 12, 8), (106, 16, 10, 8), (58, 25, 9, 7), (96, 25, 10, 7)]
for (mx, my, mw, mh) in MAISONS:
    rect(sol, mx, my, mx + mw, my + mh, G["dalles"])
    contour = []
    for x in range(mx, mx + mw + 1):
        contour += [(x, my), (x, my + mh)]
    for y in range(my + 1, my + mh):
        contour += [(mx, y), (mx + mw, y)]
    # deux brèches de 4 tuiles (porte + mur effondré), position dépendant de la maison
    breches = set()
    for bx in range(mx + mw // 2 - 2, mx + mw // 2 + 2):
        breches.add((bx, my + mh))                     # porte au sud
    by0 = my + (mh // 2) - 2
    cote = mx if (mx // 10) % 2 == 0 else mx + mw
    for by in range(by0, by0 + 4):
        breches.add((cote, by))                        # mur effondré sur un côté
    for (x, y) in contour:
        if (x, y) not in breches and terre(x, y):
            obs[y, x] = G["mur_ruine"]
    # gravats décoratifs
    for _ in range(4):
        gx, gy = rng.integers(mx + 1, mx + mw), rng.integers(my + 1, my + mh)
        deco[gy, gx] = G["cailloux"]

# puits du hameau (petit obstacle central) + caisses
disque(obs, 80, 20, 1.5, G["rocher_petit"])
for (x, y) in [(72, 22), (73, 22), (86, 21), (86, 22), (102, 30), (103, 30)]:
    obs[y, x] = G["caisse"]
BRASEROS += [(57, 18), (112, 20)]
for bx, by in BRASEROS[-2:]:
    obs[by, bx] = G["brasero"]

# ---------------------------------------------------------------------------
# 5. OUEST : Sentier des falaises (gros rochers, couloirs de 4 à 6 tuiles)
# ---------------------------------------------------------------------------
ROCHERS_OUEST = [(18, 38, 4.5), (28, 30, 3.5), (22, 52, 5.0), (36, 44, 3.0), (34, 60, 4.5),
                 (16, 66, 3.5), (44, 34, 2.5), (46, 66, 3.0), (26, 74, 3.0), (40, 52, 2.0)]
for (rx, ry, rr) in ROCHERS_OUEST:
    disque(obs, rx, ry, rr, G["rocher_gros"], seulement_si=terre)
    disque(obs, rx, ry, rr + 0.8, G["rocher_petit"], seulement_si=lambda a, b: terre(a, b) and obs[b, a] == 0 and rng.random() < 0.35)
# bosquet de pins battus par le vent (nord-ouest)
for (tx, ty) in [(30, 20), (34, 18), (38, 22), (27, 25), (42, 18), (36, 26)]:
    if terre(tx, ty):
        obs[ty, tx] = G["tronc_pin"]
        disque(dessus, tx, ty - 1, 1.8, G["feuillage_pin"])

# ---------------------------------------------------------------------------
# 6. EST : Lande aux menhirs (espace ouvert, cromlech au centre)
# ---------------------------------------------------------------------------
CROM = (130, 50)
for i in range(8):
    a = i * math.pi / 4 + 0.2
    x, y = int(round(CROM[0] + 8 * math.cos(a))), int(round(CROM[1] + 6 * math.sin(a)))
    rect(obs, x, y, x + 1, y + 1, G["menhir"])
disque(sol, CROM[0] + 0.5, CROM[1] + 0.5, 3, G["dalles"])
BRASEROS.append((130, 50))
obs[50, 130] = G["brasero"]
for (x, y) in [(112, 36), (118, 64), (144, 40), (146, 60), (122, 30), (138, 70), (108, 60), (150, 50)]:
    if terre(x, y):
        rect(obs, x, y, x + 1, y + 1, G["menhir"])
for _ in range(14):
    x, y = rng.integers(104, 152), rng.integers(28, 74)
    if terre(x, y) and obs[y, x] == 0 and sol[y, x] != G["chemin_terre"]:
        obs[y, x] = G["rocher_petit"]
# bosquet nord-est
for (tx, ty) in [(122, 20), (127, 17), (131, 22), (118, 24)]:
    if terre(tx, ty):
        obs[ty, tx] = G["tronc_pin"]
        disque(dessus, tx, ty - 1, 1.8, G["feuillage_pin"])

# ---------------------------------------------------------------------------
# 7. SUD : Grève aux barques + ponton
# ---------------------------------------------------------------------------
BARQUES = [(46, 82, 4, 2), (58, 86, 2, 4), (92, 84, 4, 2), (104, 80, 2, 4), (116, 84, 4, 2), (66, 78, 4, 2), (36, 76, 2, 4)]
for (bx, by, bw, bh) in BARQUES:
    for y in range(by, by + bh):
        for x in range(bx, bx + bw):
            if terre(x, y):
                obs[y, x] = G["barque"]
for (x, y) in [(52, 90), (53, 90), (98, 90), (110, 89), (111, 89)]:
    if terre(x, y):
        obs[y, x] = G["caisse"]
# ponton (planches au-dessus de l'eau, praticable)
PONTON = (74, 89, 77, 97)
for y in range(PONTON[1], PONTON[3] + 1):
    for x in range(PONTON[0], PONTON[2] + 1):
        sol[y, x] = G["planches"]
        obs[y, x] = 0

# re-tracer les chemins pour garantir qu'aucun obstacle ne les coupe
tracer_chemins()


# ---------------------------------------------------------------------------
# 7 bis. Bordures automatiques (herbe->sable, herbe->chemin, sable->écume)
# ---------------------------------------------------------------------------
def bordures(bases, cibles, prefixe, convertir_en=None):
    """Pose une tuile de bordure sur chaque tuile `bases` voisine d'une tuile `cibles`.
    Si la cible touche 3 côtés ou 2 côtés opposés, la tuile devient `convertir_en` (ou reste telle quelle)."""
    src = sol.copy()
    n_pose = 0
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            if src[y, x] not in bases:
                continue
            v = {"n": src[y - 1, x] in cibles, "e": src[y, x + 1] in cibles,
                 "s": src[y + 1, x] in cibles, "o": src[y, x - 1] in cibles}
            k = [d for d in ("n", "e", "s", "o") if v[d]]
            if not k:
                continue
            if len(k) >= 3 or set(k) in ({"n", "s"}, {"e", "o"}):
                if convertir_en:
                    sol[y, x] = convertir_en
                continue
            if len(k) == 1:
                d = k[0]
            else:
                d = {frozenset("ne"): "ne", frozenset("es"): "se", frozenset("so"): "so", frozenset("on"): "no"}[frozenset("".join(k))]
            sol[y, x] = G[f"{prefixe}_{d}"]
            n_pose += 1
    return n_pose


HERBES = {G["herbe"], G["herbe_sombre"]}
NB_BORDURES = 0
NB_BORDURES += bordures(HERBES, {G["chemin_terre"]}, "herbe_chemin", convertir_en=G["chemin_terre"])
NB_BORDURES += bordures(HERBES, {G["sable"]}, "herbe_sable", convertir_en=G["sable"])
NB_BORDURES += bordures({G["sable"]}, {G["eau_ecume"], G["eau_profonde"]}, "sable_ecume")

# ---------------------------------------------------------------------------
# 8. Décor (non bloquant)
# ---------------------------------------------------------------------------
for y in range(H):
    for x in range(W):
        if obs[y, x] or deco[y, x]:
            continue
        s, r = sol[y, x], rng.random()
        if s in (G["herbe"], G["herbe_sombre"]):
            if r < 0.035:
                deco[y, x] = G["herbe_haute"]
            elif r < 0.05:
                deco[y, x] = G["fleurs"]
            elif r < 0.058:
                deco[y, x] = G["cailloux"]
        elif s == G["sable"]:
            if r < 0.03:
                deco[y, x] = G["filet_algues"]
            elif r < 0.04:
                deco[y, x] = G["os_epave"]
            elif r < 0.05:
                deco[y, x] = G["flaque"]

# ---------------------------------------------------------------------------
# 9. Validation : tout le praticable est atteignable, y compris pour un gros ennemi (2x2)
# ---------------------------------------------------------------------------
def praticable_grille():
    p = np.ones((H, W), dtype=bool)
    for gid in COLLIDE:
        p &= (sol != gid)
    p &= (obs == 0)
    return p


DEPART = (80, 68)


def bfs(p, start):
    vu = np.zeros_like(p)
    q = deque([start])
    vu[start[1], start[0]] = True
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < W and 0 <= ny < H and p[ny, nx] and not vu[ny, nx]:
                vu[ny, nx] = True
                q.append((nx, ny))
    return vu


p = praticable_grille()
atteint = bfs(p, DEPART)
poches = p & ~atteint
nb_poches = int(poches.sum())
# les poches isolées deviennent des rochers (aucun ennemi ne doit apparaître enfermé)
obs[poches] = G["rocher_petit"]
p = praticable_grille()

# grille « gros ennemi » : une case est OK si le bloc 2x2 qui la commence est libre
gros = p[:-1, :-1] & p[1:, :-1] & p[:-1, 1:] & p[1:, 1:]
gros = np.pad(gros, ((0, 1), (0, 1)))

# ---------------------------------------------------------------------------
# 10. Objets : départ, apparitions, lucioles, boss, zones, lumières
# ---------------------------------------------------------------------------
objets_id = [1]


def nid():
    objets_id[0] += 1
    return objets_id[0] - 1


def point(nom, typ, tx, ty, props=None):
    o = {"id": nid(), "name": nom, "type": typ, "point": True,
         "x": tx * T + T / 2, "y": ty * T + T / 2, "width": 0, "height": 0, "rotation": 0, "visible": True}
    if props:
        o["properties"] = [{"name": k, "type": ("float" if isinstance(v, float) else "int" if isinstance(v, int) else "string"), "value": v}
                           for k, v in props.items()]
    return o


def rectangle(nom, typ, tx0, ty0, tx1, ty1, props=None):
    o = {"id": nid(), "name": nom, "type": typ,
         "x": tx0 * T, "y": ty0 * T, "width": (tx1 - tx0) * T, "height": (ty1 - ty0) * T, "rotation": 0, "visible": True}
    if props:
        o["properties"] = [{"name": k, "type": ("float" if isinstance(v, float) else "int" if isinstance(v, int) else "string"), "value": v}
                           for k, v in props.items()]
    return o


# points d'apparition : 36 points répartis le long de la côte (côté terre) + 12 dans les zones
apparitions = []
for i in range(36):
    a = i * 2 * math.pi / 36
    best = None
    for f in np.linspace(0.97, 0.6, 60):
        r = rayon_cote(a) * f
        x, y = int(CX + 72 * r * math.cos(a)), int(CY + 44 * r * math.sin(a))
        if 0 <= x < W - 1 and 0 <= y < H - 1 and gros[y, x] and atteint[y, x]:
            best = (x, y)
            break
    if best:
        apparitions.append(("cote", best))
for (x, y) in [(60, 34), (100, 34), (44, 46), (30, 62), (40, 72), (116, 44), (140, 56), (124, 68),
               (50, 22), (110, 22), (86, 80), (60, 72)]:
    if gros[y, x] and atteint[y, x]:
        apparitions.append(("interieur", (x, y)))

ZONES = [
    ("esplanade_du_phare", 62, 35, 99, 66),
    ("ruines_du_hameau", 46, 6, 120, 34),
    ("sentier_des_falaises", 8, 18, 50, 82),
    ("lande_aux_menhirs", 104, 18, 154, 80),
    ("greve_aux_barques", 30, 74, 130, 98),
]


def zone_de(x, y):
    for nom, x0, y0, x1, y1 in ZONES:
        if x0 <= x <= x1 and y0 <= y <= y1:
            return nom
    return "autre"


obj_apparitions = [point(f"spawn_{i:02d}", "spawn", x, y, {"origine": o, "zone": zone_de(x, y)})
                   for i, (o, (x, y)) in enumerate(apparitions)]

obj_joueur = [point("depart_joueur", "player_start", *DEPART)]

ARENE = (CX - 24, CY - 15, CX + 24, CY + 15)  # 48 x 30 tuiles = 1536 x 960 px
obj_boss = [
    point("boss_la_maree", "boss_spawn", CX, CY - 12),
    rectangle("arene_boss", "boss_arena", *ARENE, {"fermeture_sec": 530, "note": "mur de brume infranchissable de 8:50 jusqu'à la fin du combat"}),
]

LUCIOLES = [
    ("lucioles_esplanade", 64, 37, 96, 63, 3),
    ("lucioles_ruines", 50, 8, 116, 32, 2),
    ("lucioles_ouest", 12, 22, 48, 78, 2),
    ("lucioles_est", 106, 22, 150, 76, 2),
    ("lucioles_greve", 34, 76, 126, 92, 1),
]
obj_lucioles = [rectangle(n, "firefly_zone", x0, y0, x1, y1, {"poids": w}) for n, x0, y0, x1, y1, w in LUCIOLES]

obj_zones = [rectangle(n, "zone", x0, y0, x1, y1) for n, x0, y0, x1, y1 in ZONES]

obj_lumieres = [point(f"brasero_{i}", "light", x, y, {"rayon_px": 110, "couleur": "#ffb050", "intensite": 0.6, "allume_a_sec": 0})
                for i, (x, y) in enumerate(BRASEROS)]
obj_lumieres.append(point("phare", "light", CX, CY - 3, {"rayon_px": 600, "couleur": "#fff2c0", "intensite": 1.0, "allume_a_sec": -1}))

# ---------------------------------------------------------------------------
# 10 bis. Décors en objets image (sprites props/ du DA) + collisions invisibles
# Les tuiles d'origine restent dans la couche cachée « obstacles_tuiles » (repli).
# ---------------------------------------------------------------------------
obs_tuiles = obs.copy()
obj_decors = []


def prop(key, px_x, px_y, origin=(0.5, 1.0), angle=0, scale=1.0, depth=None, flip=False):
    o = point(key, "prop", 0, 0, {"key": key, "originX": float(origin[0]), "originY": float(origin[1]),
                                  "angle": int(angle), "scale": float(scale), "flipX": int(flip),
                                  "depth": int(round(px_y if depth is None else depth))})
    o["x"], o["y"] = round(px_x, 1), round(px_y, 1)
    obj_decors.append(o)


# phare
prop("phare", CX * T, (CY + PHARE_R) * T + 8, scale=1.25)
obs[obs == G["phare_base"]] = G["collision_invisible"]

# barques (horizontales 4x2, verticales 2x4 -> sprite tourné de 90°)
for (bx, by, bw, bh) in BARQUES:
    cx_, cy_ = (bx + bw / 2) * T, (by + bh / 2) * T
    if bw >= bh:
        prop("barque", cx_, (by + bh) * T + 6, depth=(by + bh) * T)
    else:
        prop("barque", cx_, cy_, origin=(0.5, 0.55), angle=90, depth=(by + bh) * T)
obs[obs == G["barque"]] = G["collision_invisible"]

# braseros et caisses
for y in range(H):
    for x in range(W):
        if obs[y, x] == G["brasero"]:
            prop("brasero", (x + 0.5) * T, (y + 1) * T + 2, scale=0.9)
            obs[y, x] = G["collision_invisible"]
        elif obs[y, x] == G["caisse"]:
            prop("caisse", (x + 0.5) * T, (y + 1) * T + 2, scale=0.62)
            obs[y, x] = G["collision_invisible"]

# gros rochers : les tuiles « rocher_gros » restent visibles (elles se raccordent et
# couvrent exactement la collision) ; on pose par-dessus quelques sprites rocher_grand
# pour le relief. Un sprite seul ne couvre pas un amas irrégulier sans laisser de
# murs invisibles, d'où ce mélange.
masque_rocs = obs == G["rocher_gros"]
for y in range(0, H - 3, 3):
    for x in range((y // 3) % 2 * 2, W - 4, 4):
        if masque_rocs[y:y + 3, x:x + 4].sum() >= 9:
            prop("rocher_grand", (x + 2 + rng.uniform(-0.4, 0.4)) * T, (y + 3) * T,
                 scale=float(rng.choice([1.0, 1.15, 1.3])), flip=bool(rng.random() < 0.5))

# ---------------------------------------------------------------------------
# 11. Export Tiled (.tmj)
# ---------------------------------------------------------------------------
COLS = 8
ROWS = math.ceil(len(TUILES) / COLS)


def couche_tuiles(nom, grille, lid, props=None):
    c = {"id": lid, "name": nom, "type": "tilelayer", "x": 0, "y": 0, "width": W, "height": H,
         "opacity": 1, "visible": True, "data": [int(v) for v in grille.flatten()]}
    if props:
        c["properties"] = props
    return c


def couche_objets(nom, objs, lid):
    return {"id": lid, "name": nom, "type": "objectgroup", "draworder": "topdown", "x": 0, "y": 0,
            "opacity": 1, "visible": True, "objects": objs}


tileset = {
    "firstgid": 1, "name": "falaise", "image": "tileset_falaise_etendu.png",
    "imagewidth": COLS * T, "imageheight": ROWS * T, "tilewidth": T, "tileheight": T,
    "columns": COLS, "tilecount": COLS * ROWS, "margin": 0, "spacing": 0,
    "tiles": [{"id": gid - 1, "properties": [
        {"name": "nom", "type": "string", "value": nom},
        {"name": "collides", "type": "bool", "value": c},
        {"name": "couche", "type": "string", "value": couche},
    ]} for gid, nom, c, couche, _ in TUILES],
}

carte = {
    "type": "map", "version": "1.10", "tiledversion": "1.10.2", "orientation": "orthogonal",
    "renderorder": "right-down", "infinite": False, "compressionlevel": -1,
    "width": W, "height": H, "tilewidth": T, "tileheight": T,
    "nextlayerid": 13, "nextobjectid": objets_id[0],
    "properties": [
        {"name": "nom", "type": "string", "value": "Falaise du Phare"},
        {"name": "version", "type": "string", "value": "1.0"},
    ],
    "tilesets": [tileset],
    "layers": [
        couche_tuiles("sol", sol, 1),
        couche_tuiles("deco", deco, 2),
        couche_tuiles("obstacles", obs, 3),
        dict(couche_tuiles("obstacles_tuiles", obs_tuiles, 11), visible=False),
        couche_tuiles("dessus", dessus, 4, [{"name": "depth", "type": "int", "value": 100}]),
        couche_objets("joueur", obj_joueur, 5),
        couche_objets("apparitions", obj_apparitions, 6),
        couche_objets("boss", obj_boss, 7),
        couche_objets("lucioles", obj_lucioles, 8),
        couche_objets("zones", obj_zones, 9),
        couche_objets("lumieres", obj_lumieres, 10),
        couche_objets("decors", obj_decors, 12),
    ],
}
with open(os.path.join(SORTIE, "falaise_du_phare.tmj"), "w", encoding="utf-8") as f:
    json.dump(carte, f, ensure_ascii=False, separators=(",", ":"))

# ---------------------------------------------------------------------------
# 12. Tilesets
#   - tileset_falaise_provisoire.png : couleurs unies (repli, toujours généré)
#   - tileset_falaise_etendu.png     : tuiles 1-28 du DA + bordures 29-52 dérivées
#     automatiquement de ses tuiles (frange ondulée) + tuile 53 transparente.
#     Le DA peut redessiner les tuiles 29-56 à la main en gardant la grille.
# ---------------------------------------------------------------------------
ts = Image.new("RGBA", (COLS * T, ROWS * T), (0, 0, 0, 0))
d = ImageDraw.Draw(ts)
for gid, nom, c, couche, col in TUILES:
    i = gid - 1
    x0, y0 = (i % COLS) * T, (i // COLS) * T
    if nom == "collision_invisible":
        continue
    if couche in ("sol",):
        d.rectangle([x0, y0, x0 + T - 1, y0 + T - 1], fill=col + (255,))
    elif couche == "deco":
        for k in range(5):
            px, py = x0 + 5 + (k * 7) % 22, y0 + 6 + (k * 11) % 20
            d.ellipse([px, py, px + 4, py + 4], fill=col + (255,))
    elif couche == "obstacles":
        d.rounded_rectangle([x0 + 2, y0 + 2, x0 + T - 3, y0 + T - 3], radius=6, fill=col + (255,), outline=(20, 20, 24, 255), width=2)
    else:
        d.ellipse([x0 + 1, y0 + 1, x0 + T - 2, y0 + T - 2], fill=col + (200,))


def tuile(img, gid):
    i = gid - 1
    return img.crop(((i % COLS) * T, (i // COLS) * T, (i % COLS) * T + T, (i // COLS) * T + T))


def masque_frange(d):
    """masque 32x32 : 255 = frange (matière voisine), côté(s) indiqué(s), bord ondulé de ~9 px"""
    m = np.zeros((T, T), dtype=np.uint8)
    yy, xx = np.mgrid[0:T, 0:T]
    def bande(dist_bord, coord):
        prof = 8 + 2.2 * np.sin(coord * 0.55) + 1.2 * np.sin(coord * 1.3 + 1.0)
        return dist_bord < prof
    if "n" in d: m[bande(yy, xx)] = 255
    if "s" in d: m[bande(T - 1 - yy, xx)] = 255
    if "e" in d: m[bande(T - 1 - xx, yy)] = 255
    if "o" in d: m[bande(xx, yy)] = 255
    return Image.fromarray(m, "L")


def bordures_dans(img):
    for pre, base, frange, _ in BORDURES:
        for d_ in DIRS:
            gid = G[f"{pre}_{d_}"]
            i = gid - 1
            t_ = tuile(img, base).copy()
            t_.paste(tuile(img, frange), (0, 0), masque_frange(d_))
            img.paste(t_, ((i % COLS) * T, (i // COLS) * T))
    return img


ts = bordures_dans(ts)
ts.save(os.path.join(SORTIE, "tileset_falaise_provisoire.png"))

ets = ts.copy()
TILESET_SOURCE = "provisoire"
if os.path.exists(TILESET_DA):
    da = Image.open(TILESET_DA).convert("RGBA")
    if da.size[0] >= COLS * T:
        n_da = min(28, (da.size[0] // T) * (da.size[1] // T))
        for gid in range(1, n_da + 1):
            i = gid - 1
            ets.paste((0, 0, 0, 0), ((i % COLS) * T, (i // COLS) * T, (i % COLS) * T + T, (i // COLS) * T + T))
            ets.paste(tuile(da, gid), ((i % COLS) * T, (i // COLS) * T))
        # le DA a déjà dessiné des tuiles au-delà de 28 ? on les garde telles quelles
        n_tot = (da.size[0] // T) * (da.size[1] // T)
        ets = bordures_dans(ets)
        for gid in range(29, min(n_tot, COLS * ROWS) + 1):
            t_ = tuile(da, gid)
            if np.array(t_)[:, :, 3].max() > 0:
                i = gid - 1
                ets.paste(t_, ((i % COLS) * T, (i // COLS) * T))
        TILESET_SOURCE = TILESET_DA
ets.save(os.path.join(SORTIE, "tileset_falaise_etendu.png"))

# ---------------------------------------------------------------------------
# 13. Aperçu annoté (6 px par tuile)
# ---------------------------------------------------------------------------
S = 6
COUL = {gid: col for gid, _, _, _, col in TUILES}
img = Image.new("RGB", (W * S, H * S + 120), (16, 18, 24))
px = img.load()
for y in range(H):
    for x in range(W):
        g = obs[y, x] if obs[y, x] else sol[y, x]
        col = COUL[g]
        if dessus[y, x] and not obs[y, x]:
            col = tuple(int(c * 0.75) for c in COUL[dessus[y, x]])
        for j in range(S):
            for i in range(S):
                px[x * S + i, y * S + j] = col
dr = ImageDraw.Draw(img)
try:
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 13)
    petit = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 11)
except OSError:
    font = petit = ImageFont.load_default()

# arène du boss
ax0, ay0, ax1, ay1 = ARENE
dr.rectangle([ax0 * S, ay0 * S, ax1 * S, ay1 * S], outline=(220, 80, 80), width=2)
dr.text((ax0 * S + 4, ay0 * S + 3), "Arène du boss (8:50)", fill=(240, 120, 120), font=petit)
# apparitions
for o, (x, y) in apparitions:
    c = (200, 90, 220) if o == "cote" else (150, 110, 230)
    dr.ellipse([x * S - 4, y * S - 4, x * S + 4, y * S + 4], fill=c, outline=(20, 10, 30))
# lumières
for (x, y) in BRASEROS:
    dr.ellipse([x * S - 5, y * S - 5, x * S + 5, y * S + 5], outline=(255, 180, 80), width=2)
# départ et boss
x, y = DEPART
dr.polygon([(x * S, y * S - 8), (x * S - 7, y * S + 6), (x * S + 7, y * S + 6)], fill=(255, 220, 90), outline=(0, 0, 0))
bx, by = CX, CY - 12
dr.rectangle([bx * S - 6, by * S - 6, bx * S + 6, by * S + 6], fill=(230, 60, 60), outline=(0, 0, 0))
# noms de zones
for nom, lx, ly in [("RUINES DU HAMEAU", 66, 4), ("SENTIER DES FALAISES", 14, 26), ("LANDE AUX MENHIRS", 113, 26),
                    ("GRÈVE AUX BARQUES", 63, 95), ("ESPLANADE DU PHARE", 63, 72)]:
    dr.text((lx * S, ly * S), nom, fill=(240, 236, 220), font=font, stroke_width=2, stroke_fill=(10, 10, 14))
# légende
ly = H * S + 10
items = [((255, 220, 90), "Départ de Lumen"), ((230, 60, 60), "Apparition du boss"), ((200, 90, 220), "Point d'apparition (côte)"),
         ((150, 110, 230), "Point d'apparition (intérieur)"), ((255, 180, 80), "Brasero (lumière)"), ((96, 92, 100), "Rochers / falaise (bloquant)"),
         ((140, 132, 118), "Murs en ruine (bloquant)"), ((128, 84, 52), "Barques (bloquant)"), ((110, 92, 70), "Chemins"), ((98, 104, 112), "Dalles")]
for k, (c, t) in enumerate(items):
    cx, cy = 12 + (k % 4) * 240, ly + (k // 4) * 24
    dr.rectangle([cx, cy, cx + 14, cy + 14], fill=c)
    dr.text((cx + 20, cy), t, fill=(220, 220, 220), font=petit)
dr.text((12, ly + 80), f"Falaise du Phare · {W}×{H} tuiles de {T} px = {W*T}×{H*T} px (≈ 4 écrans de large) · 1 tuile = {S} px sur ce plan",
        fill=(160, 160, 170), font=petit)
img.save(os.path.join(SORTIE, "apercu_falaise_du_phare.png"))

# ---------------------------------------------------------------------------
# Rapport
# ---------------------------------------------------------------------------
total = int(ile.sum())
print(f"Carte {W}x{H}, praticable : {int(p.sum())} tuiles ({100*p.sum()/total:.0f} % de l'île)")
print(f"Poches isolées bouchées : {nb_poches} tuiles")
print(f"Points d'apparition : {len(apparitions)} ({sum(1 for o,_ in apparitions if o=='cote')} côte)")
gros_atteint = bfs(gros, DEPART)
ko = [(o, xy) for o, xy in apparitions if not gros_atteint[xy[1], xy[0]]]
print(f"Apparitions inaccessibles pour un ennemi 2x2 : {len(ko)} {ko}")
arene_libre = p[ARENE[1]:ARENE[3], ARENE[0]:ARENE[2]].mean()
print(f"Arène du boss libre à {100*arene_libre:.0f} %")
print(f"Bordures automatiques posées : {NB_BORDURES} tuiles")
print(f"Décors en objets image : {len(obj_decors)} ({sum(1 for o in obj_decors if o['name']=='rocher_grand')} rochers)")
print(f"Tileset étendu construit depuis : {TILESET_SOURCE}")
