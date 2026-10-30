# Bakes the Demon Knight idle pose into public/models/knight.bin (quantized, indexed).
# blender -b --python scripts/export-knight.py -- "<path>/Unarmed Idle.fbx"
import bpy,sys,struct,bmesh
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=sys.argv[-1])
sc=bpy.context.scene; sc.frame_set(1)
arm=[o for o in bpy.data.objects if o.type=='ARMATURE'][0]
for b in arm.pose.bones:
    if 'Head' in b.name or 'Neck' in b.name or 'Spine2' in b.name:
        w=arm.matrix_world@b.head; t=arm.matrix_world@b.tail; print('bone',b.name,(w.x,w.z,-w.y),(t.x,t.z,-t.y))
ob=[o for o in bpy.data.objects if o.type=='MESH'][0]
dg=bpy.context.evaluated_depsgraph_get()
me=bpy.data.meshes.new_from_object(ob.evaluated_get(dg)); me.transform(ob.matrix_world)
bm=bmesh.new(); bm.from_mesh(me); bmesh.ops.triangulate(bm,faces=bm.faces); bm.to_mesh(me)
V=[(v.co.x,v.co.z,-v.co.y) for v in me.vertices]
mn=[min(v[i] for v in V) for i in range(3)]; mx=[max(v[i] for v in V) for i in range(3)]
T=[(p.material_index,list(p.vertices)) for p in me.polygons]
print('verts',len(V),'tris',len(T),mn,mx)
with open('knight.bin','wb') as f:
    f.write(struct.pack('<2I',len(V),len(T))); f.write(struct.pack('<6f',*mn,*mx))
    for v in V: f.write(struct.pack('<3H',*[round((v[i]-mn[i])/(mx[i]-mn[i])*65535) for i in range(3)]))
    for _,ix in T: f.write(struct.pack('<3H',*ix))
    f.write(bytes(m for m,_ in T))
