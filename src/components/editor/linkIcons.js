import {
  BookOpen,
  Briefcase,
  Camera,
  CodeXml,
  FileText,
  Globe,
  Link,
  Mail,
  Mic,
  Music,
  Palette,
  PenTool,
  User,
  Video,
} from 'lucide-react';

// Icônes proposées pour un lien. `id` est le nom exporté par lucide-react, enregistré
// dans socialLinks[].icon (lucide n'a plus d'icônes de marque : pas de « Linkedin »).
export const LINK_ICONS = [
  { id: 'Link', label: 'Lien', Icon: Link },
  { id: 'Globe', label: 'Site web', Icon: Globe },
  { id: 'Briefcase', label: 'Profil professionnel (LinkedIn…)', Icon: Briefcase },
  { id: 'User', label: 'Profil', Icon: User },
  { id: 'FileText', label: 'Document', Icon: FileText },
  { id: 'BookOpen', label: 'Publication', Icon: BookOpen },
  { id: 'PenTool', label: 'Graphisme', Icon: PenTool },
  { id: 'Palette', label: 'Créations', Icon: Palette },
  { id: 'Camera', label: 'Photographie', Icon: Camera },
  { id: 'Video', label: 'Vidéo', Icon: Video },
  { id: 'Music', label: 'Musique', Icon: Music },
  { id: 'Mic', label: 'Podcast', Icon: Mic },
  { id: 'Mail', label: 'E-mail', Icon: Mail },
  { id: 'CodeXml', label: 'Code', Icon: CodeXml },
];
