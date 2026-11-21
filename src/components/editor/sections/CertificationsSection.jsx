import { Award, Building2, Calendar } from 'lucide-react';
import { newCertification } from '../../../lib/schema';
import ItemList from '../ItemList';
import TextField from '../TextField';
import { fieldId } from '../listUtils';

// Section « Certifications » : certificats, habilitations, permis…
export default function CertificationsSection({ items, update }) {
  return (
    <ItemList
      field="certifications"
      items={items}
      update={update}
      create={newCertification}
      kind="certification"
      firstField="name"
      addLabel="Ajouter une certification"
      emptyText="Certificats, habilitations, permis… (facultatif)."
      hiddenNote="Cette certification est masquée : elle reste enregistrée mais n'apparaît pas sur le CV."
      renderBody={(cert, { patch }) => (
        <>
          <TextField
            id={fieldId(cert.id, 'name')}
            label="Intitulé"
            icon={Award}
            value={cert.name}
            placeholder="Ex. Sauveteur secouriste du travail (SST)"
            onChange={(name) => patch({ name })}
          />
          <div className="editor-grid">
            <TextField
              id={fieldId(cert.id, 'issuer')}
              className="editor-field-wide"
              label="Organisme (facultatif)"
              icon={Building2}
              value={cert.issuer}
              placeholder="Ex. Croix-Rouge française"
              onChange={(issuer) => patch({ issuer })}
            />
            <TextField
              id={fieldId(cert.id, 'date')}
              className="editor-field-narrow"
              label="Date"
              icon={Calendar}
              value={cert.date}
              placeholder="Ex. 2024"
              onChange={(date) => patch({ date })}
            />
          </div>
        </>
      )}
    />
  );
}
