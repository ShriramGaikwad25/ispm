"use client";

// Clone a review form (dialog). Only the Identity section can be set:
// code, title, intent, submit authority and tags. Applies To, fields and
// outcomes are copied unchanged.
//   POST /compliance/review-forms/{code}/clone   then, if intent / submit authority / tags
//   PUT  /compliance/review-forms/{newCode}      differ from the source, on the new DRAFT.

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  REVIEW_FORMS_KEY, ReviewForms, SUBMIT_AUTHORITIES, toReviewFormRequest, type ApiReviewForm,
} from "@/lib/assurance-review-forms";
import { BTN_PRIMARY, BTN_SECONDARY, INPUT, LABEL, Modal, Spinner, cx } from "@/components/assurance-events/ui";

export function CloneReviewForm({ src, onDone, onClose }: { src: ApiReviewForm; onDone: (created: ApiReviewForm) => void; onClose: () => void }) {
  const qc = useQueryClient();
  const [code, setCode] = useState(src.system ? `MY_${src.code}` : `${src.code}_COPY`);
  const [title, setTitle] = useState(`${src.title} (copy)`);
  const [intent, setIntent] = useState(src.intent ?? "");
  const [submitAuthority, setSubmitAuthority] = useState(src.submitAuthority || "REVIEWER_OR_DECIDER");
  const [tags, setTags] = useState((src.tags ?? []).join(", "));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      let created = await ReviewForms.clone(src.code, { code: code.trim(), title: title.trim() });
      const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
      const changed = intent !== (src.intent ?? "") ||
        submitAuthority !== (src.submitAuthority || "REVIEWER_OR_DECIDER") ||
        JSON.stringify(tagList) !== JSON.stringify(src.tags ?? []);
      if (changed) {
        created = await ReviewForms.update(created.code, {
          ...toReviewFormRequest(created), title: title.trim(), intent, submitAuthority, tags: tagList,
        });
      }
      await qc.invalidateQueries({ queryKey: REVIEW_FORMS_KEY });
      onClose();
      onDone(created);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Clone ${src.code} v${src.version}`} onClose={onClose}>
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        A tenant DRAFT copy under a new code. Only its identity can be changed; who it applies to, its fields and its
        outcomes are copied unchanged. Preview it, then activate.
      </p>
      <div>
        <label className={LABEL}>New Code (UPPER_SNAKE_CASE)</label>
        <input className={cx(INPUT, "font-mono")} value={code} onChange={(e) => setCode(e.target.value)} />
      </div>
      <div>
        <label className={LABEL}>Title</label>
        <input className={INPUT} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label className={LABEL}>Intent (the one-line instruction the reviewer sees)</label>
        <textarea className={INPUT} rows={2} value={intent} onChange={(e) => setIntent(e.target.value)} />
      </div>
      <div>
        <label className={LABEL}>Submit authority (who may submit)</label>
        <select className={INPUT} value={submitAuthority} onChange={(e) => setSubmitAuthority(e.target.value)}>
          {SUBMIT_AUTHORITIES.map((a) => <option key={a}>{a}</option>)}
        </select>
      </div>
      <div>
        <label className={LABEL}>Tags (comma separated)</label>
        <input className={INPUT} value={tags} onChange={(e) => setTags(e.target.value)} />
      </div>
      {err && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
      <div className="flex justify-end gap-2">
        <button type="button" className={BTN_SECONDARY} onClick={onClose}>Cancel</button>
        <button type="button" className={BTN_PRIMARY} disabled={busy || !code.trim() || !title.trim()} onClick={submit}>
          {busy && <Spinner size={14} className="text-white" />} Clone
        </button>
      </div>
    </div>
    </Modal>
  );
}
