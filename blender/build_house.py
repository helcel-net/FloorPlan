# Builds a clean, editable Blender model from a plan exported via the
# floorplan editor's Export button (Settings popover). The same JSON file
# can also be re-imported into the editor with the Import button.
#
# Usage:
#   blender --background --python blender/build_house.py -- plan.json house.blend
#
# The second argument (output .blend path) is optional; it defaults to the
# input path with a .blend extension. Run without --background to inspect
# the result in the Blender UI instead of saving straight to disk.

import bpy
import bmesh
import json
import sys
from math import cos, sin
from mathutils import Vector

# Tunable defaults -- the exported JSON only carries 2D geometry (no
# heights), so all vertical dimensions live here and can be tweaked without
# re-exporting from the app.
WALL_HEIGHT_M = 2.5
FLOOR_TO_FLOOR_HEIGHT_M = 2.9
SLAB_THICKNESS_M = 0.15
ROOF_THICKNESS_M = 0.2
BUILD_ROOF = True

DOOR_HEIGHT_M = 2.05
DOOR_SILL_M = 0.0
WINDOW_SILL_M = 0.9
WINDOW_HEIGHT_M = 1.2

DOOR_LEAF_COLOR = (0.35, 0.22, 0.12, 1.0)
WINDOW_GLASS_COLOR = (0.72, 0.85, 0.88, 0.35)
MIN_SEGMENT_M = 0.01


def parse_args():
    argv = sys.argv
    if '--' in argv:
        argv = argv[argv.index('--') + 1:]
    else:
        argv = []
    if not argv:
        raise SystemExit('Usage: blender --background --python build_house.py -- plan.json [out.blend]')
    json_path = argv[0]
    out_path = argv[1] if len(argv) > 1 else json_path.rsplit('.', 1)[0] + '.blend'
    return json_path, out_path


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


_material_cache = {}


def get_material(name, rgba):
    key = (name, tuple(rgba))
    if key in _material_cache:
        return _material_cache[key]
    mat = bpy.data.materials.new(name=name)
    mat.diffuse_color = rgba
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    if bsdf is not None:
        bsdf.inputs['Base Color'].default_value = rgba
        if 'Roughness' in bsdf.inputs:
            bsdf.inputs['Roughness'].default_value = 0.85
        if len(rgba) > 3 and rgba[3] < 1.0 and 'Alpha' in bsdf.inputs:
            bsdf.inputs['Alpha'].default_value = rgba[3]
            mat.blend_method = 'BLEND'
    _material_cache[key] = mat
    return mat


DEFAULT_RGBA = (0.6, 0.6, 0.6, 1.0)


def hex_to_rgba(hex_color, alpha=1.0):
    try:
        hex_color = str(hex_color).lstrip('#')
        r = int(hex_color[0:2], 16) / 255.0
        g = int(hex_color[2:4], 16) / 255.0
        b = int(hex_color[4:6], 16) / 255.0
        return (r, g, b, alpha)
    except (ValueError, TypeError, IndexError):
        warn(f"invalid color {hex_color!r}, using a default gray")
        return DEFAULT_RGBA


def warn(message):
    print(f"[build_house] warning: {message}", file=sys.stderr)


def link_object(obj, collection):
    collection.objects.link(obj)
    return obj


def make_box_object(name, collection, origin, angle_rad, length_m, thickness_m, z_bottom, height_m, material=None):
    """Box spanning local x:[0,length], y:[-thickness/2,thickness/2], z:[0,height],
    then placed at `origin` and rotated by `angle_rad` around Z."""
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    half_t = thickness_m / 2
    verts = [
        bm.verts.new((0, -half_t, 0)),
        bm.verts.new((length_m, -half_t, 0)),
        bm.verts.new((length_m, half_t, 0)),
        bm.verts.new((0, half_t, 0)),
        bm.verts.new((0, -half_t, height_m)),
        bm.verts.new((length_m, -half_t, height_m)),
        bm.verts.new((length_m, half_t, height_m)),
        bm.verts.new((0, half_t, height_m))
    ]
    faces = [
        (0, 1, 2, 3), (4, 7, 6, 5),
        (0, 4, 5, 1), (1, 5, 6, 2),
        (2, 6, 7, 3), (3, 7, 4, 0)
    ]
    for f in faces:
        bm.faces.new([verts[i] for i in f])
    bm.normal_update()
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new(name, mesh)
    obj.location = (origin[0], origin[1], z_bottom)
    obj.rotation_euler = (0, 0, angle_rad)
    link_object(obj, collection)
    if material is not None:
        obj.data.materials.append(material)
    return obj


def make_ngon_prism_object(name, collection, polygon_xy, z_bottom, thickness_m, material=None):
    if len(polygon_xy) < 3:
        return None
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bottom = [bm.verts.new((p[0], p[1], 0)) for p in polygon_xy]
    top = [bm.verts.new((p[0], p[1], thickness_m)) for p in polygon_xy]
    bm.faces.new(reversed(bottom))
    bm.faces.new(top)
    n = len(polygon_xy)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((bottom[i], bottom[j], top[j], top[i]))
    bm.normal_update()
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new(name, mesh)
    obj.location = (0, 0, z_bottom)
    link_object(obj, collection)
    if material is not None:
        obj.data.materials.append(material)
    return obj


def to_world_xy(point_m, plan_y_sign=-1):
    # Plan Y grows downward on screen; flip it so the model reads correctly
    # from Blender's default top-down view.
    return (point_m['x'], plan_y_sign * point_m['y'])


def wall_geometry(wall):
    sx, sy = to_world_xy(wall['startM'])
    ex, ey = to_world_xy(wall['endM'])
    dx, dy = ex - sx, ey - sy
    length = (dx ** 2 + dy ** 2) ** 0.5
    angle = 0.0 if length < 1e-6 else __import__('math').atan2(dy, dx)
    return (sx, sy), angle, length


def as_float(value, default, label):
    try:
        result = float(value)
        if result != result:  # NaN
            raise ValueError
        return result
    except (TypeError, ValueError):
        warn(f"{label} is not a valid number ({value!r}), using {default}")
        return default


def build_floor(floor, floor_collection, z_base):
    walls = [w for w in (floor.get('walls') or []) if isinstance(w, dict) and 'startM' in w and 'endM' in w]
    wall_ids = {w.get('id') for w in walls}
    openings = [o for o in (floor.get('openings') or []) if isinstance(o, dict)]

    openings_by_wall = {}
    for opening in openings:
        wall_id = opening.get('wallId')
        if wall_id not in wall_ids:
            warn(f"opening {opening.get('id', '?')} references unknown wallId {wall_id!r}, skipping")
            continue
        openings_by_wall.setdefault(wall_id, []).append(opening)

    for wall in walls:
        origin, angle, length = wall_geometry(wall)
        if length < 1e-6:
            warn(f"wall {wall.get('id', '?')} has zero length, skipping")
            continue
        thickness = as_float(wall.get('thicknessM'), 0.115, f"wall {wall.get('id', '?')} thicknessM")
        if thickness <= 0:
            warn(f"wall {wall.get('id', '?')} has non-positive thickness, using 0.115")
            thickness = 0.115
        wall_mat = get_material(f"wall-{wall.get('material', 'default')}", hex_to_rgba(wall.get('colorHex')))

        def place(local_x, seg_len, seg_z, seg_h, name):
            if seg_len <= MIN_SEGMENT_M or seg_h <= MIN_SEGMENT_M:
                return
            make_box_object(
                name, floor_collection,
                (origin[0] + local_x * cos(angle), origin[1] + local_x * sin(angle)),
                angle, seg_len, thickness, z_base + seg_z, seg_h, wall_mat
            )

        # Openings punch the wall into jamb/header/sill box segments instead
        # of a boolean cut -- Blender's exact solver leaves stray coplanar
        # faces on thin full-depth cuts like these, so plain non-overlapping
        # boxes are the more robust way to get a clean opening.
        events = []
        for opening in openings_by_wall.get(wall.get('id'), []):
            position = opening.get('positionM')
            if not isinstance(position, dict):
                warn(f"opening {opening.get('id', '?')} has no positionM, skipping")
                continue
            width = as_float(opening.get('widthM'), 0, f"opening {opening.get('id', '?')} widthM")
            if width <= 0:
                warn(f"opening {opening.get('id', '?')} has non-positive width, skipping")
                continue
            proj_x, proj_y = to_world_xy(position)
            dist_along = ((proj_x - origin[0]) ** 2 + (proj_y - origin[1]) ** 2) ** 0.5
            is_door = opening.get('kind') == 'door'
            sill = DOOR_SILL_M if is_door else WINDOW_SILL_M
            open_height = DOOR_HEIGHT_M if is_door else WINDOW_HEIGHT_M
            # Clamp so a stray oversized opening never produces a negative-height
            # header/sill segment further down.
            sill = max(0.0, min(sill, WALL_HEIGHT_M))
            open_height = max(0.0, min(open_height, WALL_HEIGHT_M - sill))
            events.append({
                'start': dist_along - width / 2,
                'end': dist_along + width / 2,
                'sill': sill,
                'height': open_height,
                'opening': opening,
                'is_door': is_door
            })
        events.sort(key=lambda e: e['start'])

        cursor = 0.0
        seg_i = 0
        for event in events:
            start = max(cursor, min(event['start'], length))
            end = max(cursor, min(event['end'], length))
            if start > cursor:
                place(cursor, start - cursor, 0, WALL_HEIGHT_M, f"Wall_{wall.get('id', 'wall')}_{seg_i}")
                seg_i += 1
            if event['sill'] > MIN_SEGMENT_M:
                place(start, end - start, 0, event['sill'], f"Wall_{wall.get('id', 'wall')}_{seg_i}")
                seg_i += 1
            header_bottom = event['sill'] + event['height']
            if header_bottom < WALL_HEIGHT_M:
                place(start, end - start, header_bottom, WALL_HEIGHT_M - header_bottom, f"Wall_{wall.get('id', 'wall')}_{seg_i}")
                seg_i += 1
            cursor = end

            opening = event['opening']
            leaf_length = min(event['end'], length) - max(event['start'], 0)
            leaf_thickness = thickness * (1.0 if event['is_door'] else 0.15)
            leaf_color = DOOR_LEAF_COLOR if event['is_door'] else WINDOW_GLASS_COLOR
            leaf_mat = get_material('door-leaf' if event['is_door'] else 'window-glass', leaf_color)
            if leaf_length > MIN_SEGMENT_M and event['height'] > MIN_SEGMENT_M:
                make_box_object(
                    f"Leaf_{opening.get('id', 'opening')}", floor_collection,
                    (origin[0] + start * cos(angle), origin[1] + start * sin(angle)),
                    angle, leaf_length, leaf_thickness, z_base + event['sill'], event['height'], leaf_mat
                )

        if cursor < length:
            place(cursor, length - cursor, 0, WALL_HEIGHT_M, f"Wall_{wall.get('id', 'wall')}_{seg_i}")

    top_floor_polygons = []
    for room in (floor.get('rooms') or []):
        if not isinstance(room, dict):
            continue
        polygon_m = room.get('polygonM') or []
        polygon = [to_world_xy(p) for p in polygon_m if isinstance(p, dict)]
        if len(polygon) < 3:
            warn(f"room {room.get('key', '?')} has fewer than 3 polygon vertices, skipping slab")
            continue
        floor_mat = get_material(f"floor-{room.get('material', 'default')}", hex_to_rgba(room.get('colorHex')))
        make_ngon_prism_object(
            f"Slab_{room.get('key', 'room')}", floor_collection, polygon,
            z_base - SLAB_THICKNESS_M, SLAB_THICKNESS_M, floor_mat
        )
        top_floor_polygons.append(polygon)

    return top_floor_polygons


def load_plan(json_path):
    try:
        with open(json_path, 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        raise SystemExit(f"No such file: {json_path}")
    except json.JSONDecodeError as exc:
        raise SystemExit(f"{json_path} is not valid JSON: {exc}")

    if not isinstance(data, dict) or not isinstance(data.get('floors'), list):
        raise SystemExit(f"{json_path} doesn't look like a floorplan export (missing a 'floors' list)")
    if not data['floors']:
        raise SystemExit(f"{json_path} has no floors to build")
    return data


def build_house(data):
    reset_scene()
    scene_collection = bpy.context.scene.collection

    floors = sorted(
        (f for f in data['floors'] if isinstance(f, dict)),
        key=lambda f: as_float(f.get('index'), 0, "floor index")
    )

    top_floor_polygons = []
    top_z = 0.0
    for i, floor in enumerate(floors):
        floor_index = as_float(floor.get('index'), i, "floor index")
        floor_collection = bpy.data.collections.new(floor.get('name') or f"Floor {i + 1}")
        scene_collection.children.link(floor_collection)
        z_base = floor_index * FLOOR_TO_FLOOR_HEIGHT_M
        polygons = build_floor(floor, floor_collection, z_base)
        if polygons:
            top_floor_polygons = polygons
        top_z = z_base + WALL_HEIGHT_M

    if BUILD_ROOF and top_floor_polygons:
        roof_collection = bpy.data.collections.new('Roof')
        scene_collection.children.link(roof_collection)
        roof_mat = get_material('roof', (0.3, 0.3, 0.32, 1.0))
        for i, polygon in enumerate(top_floor_polygons):
            make_ngon_prism_object(f"Roof_{i}", roof_collection, polygon, top_z, ROOF_THICKNESS_M, roof_mat)


def main():
    json_path, out_path = parse_args()
    data = load_plan(json_path)
    build_house(data)
    bpy.ops.wm.save_as_mainfile(filepath=out_path)
    print(f"Saved {out_path}")


if __name__ == '__main__':
    try:
        main()
    except SystemExit as exc:
        print(f"[build_house] error: {exc}", file=sys.stderr)
        sys.exit(1)
