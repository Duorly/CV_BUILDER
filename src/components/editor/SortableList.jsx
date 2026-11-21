import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const restrictToVerticalAxis = ({ transform }) => ({ ...transform, x: 0 });

const position = (node) => {
  const sortable = node?.data?.current?.sortable;
  return sortable ? `${sortable.index + 1} sur ${sortable.items.length}` : '';
};

// Messages lus par les lecteurs d'écran pendant un déplacement au clavier.
const accessibility = {
  screenReaderInstructions: {
    draggable:
      'Pour déplacer cet élément, appuyez sur Espace ou Entrée, puis utilisez les flèches haut et bas. ' +
      'Appuyez de nouveau sur Espace ou Entrée pour le déposer, ou sur Échap pour annuler.',
  },
  announcements: {
    onDragStart: ({ active }) => `Élément saisi, position ${position(active)}.`,
    onDragOver: ({ over }) => (over ? `Position ${position(over)}.` : 'Hors de la liste.'),
    onDragEnd: ({ over }) => (over ? `Élément déposé en position ${position(over)}.` : 'Élément déposé.'),
    onDragCancel: () => 'Déplacement annulé.',
  },
};

// Liste réordonnable par glisser-déposer (souris, tactile ou clavier sur la poignée).
// `ids` doit suivre l'ordre des enfants ; onMove(from, to) reçoit des index.
export default function SortableList({ ids, onMove, as: Tag = 'ul', className, children, ...rest }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(active.id);
    const to = ids.indexOf(over.id);
    if (from !== -1 && to !== -1) onMove(from, to);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
      accessibility={accessibility}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <Tag className={className} {...rest}>
          {children}
        </Tag>
      </SortableContext>
    </DndContext>
  );
}

// Props à poser sur la ligne (rowProps) et sur la poignée (handleProps).
export function useSortableRow(id) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  return {
    isDragging,
    rowProps: {
      ref: setNodeRef,
      style: {
        transform: CSS.Translate.toString(transform),
        transition,
        position: 'relative',
        zIndex: isDragging ? 2 : undefined,
      },
    },
    handleProps: { ref: setActivatorNodeRef, ...attributes, ...listeners },
  };
}
