import React, { useState, useRef, useEffect, FormEvent } from "react";
import * as d3 from "d3";
import { callGemini, parseGeminiJson } from "../../services/geminiService";
import { saveToolUsage, addHistoryEntry } from "../../hooks/useFirestore";
import LoadingSpinner from "../../components/LoadingSpinner";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../../hooks/useLanguage";
import VoiceInput from "../../components/VoiceInput";
import ShareCard from "../../components/ShareCard";

interface ConceptNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  summary: string;
  cluster: string;
  importance: number;
}

interface ConceptEdge extends d3.SimulationLinkDatum<ConceptNode> {
  relationship: string;
  strength: number;
}

interface MapResult {
  nodes: ConceptNode[];
  edges: ConceptEdge[];
  studyOrder: string[];
  insight: string;
}

export default function ConceptLinker() {
  const [topics, setTopics] = useState<string[]>([]);
  const [topicInput, setTopicInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MapResult | null>(null);
  const [selectedNode, setSelectedNode] = useState<ConceptNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { languageInstruction } = useLanguage();

  const addTopic = (e?: FormEvent) => {
    e?.preventDefault();
    if (!topicInput.trim() || topics.length >= 10) return;
    if (!topics.includes(topicInput.trim())) {
      setTopics([...topics, topicInput.trim()]);
    }
    setTopicInput("");
  };

  const removeTopic = (t: string) => {
    setTopics(topics.filter((existing) => existing !== t));
  };

  const generateMap = async () => {
    if (topics.length < 2) return;
    setLoading(true);
    setResult(null);
    setSelectedNode(null);
    setError(null);

    const prompt = `You are a knowledge graph builder for students.

Topics: ${topics.join(", ")}

Analyze the conceptual relationships between these topics and build a knowledge graph.

Return ONLY this JSON:
{
  "nodes": [
    {
      "id": "unique_id",
      "label": "topic name",
      "summary": "2-sentence explanation of this topic",
      "cluster": "category group name",
      "importance": 1-5
    }
  ],
  "edges": [
    {
      "source": "node_id",
      "target": "node_id",
      "relationship": "short label like 'builds on' or 'required for' or 'part of'",
      "strength": 1-3
    }
  ],
  "studyOrder": ["topic1", "topic2", "...in recommended sequence"],
  "insight": "one key insight about how these topics connect"
}

Create edges only where a genuine conceptual dependency or relationship exists.
Cluster related topics together with the same cluster name.
Return ONLY valid JSON.`;

    try {
      const text = await callGemini(prompt, { languageInstruction });
      const parsed = parseGeminiJson(text);
      setResult(parsed);
      await saveToolUsage("conceptlinker");
      await addHistoryEntry("conceptMaps", {
        topics,
        graph: JSON.stringify(parsed),
      });
    } catch (error: any) {
      console.error(error);
      setError(
        "Failed to link concepts. Please try removing some topics or try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!result || !svgRef.current) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight || 600;
    const nodes = result.nodes.map((n) => ({ ...n }));
    const links = result.edges.map((e) => ({ ...e }));

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const container = svg.append("g");

    svg.call(
      d3.zoom<SVGSVGElement, unknown>().on("zoom", (event) => {
        container.attr("transform", event.transform);
      }),
    );

    const simulation = d3
      .forceSimulation(nodes as any)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance(150),
      )
      .force("charge", d3.forceManyBody().strength(-600))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const color = d3.scaleOrdinal(d3.schemeTableau10);

    const link = container
      .append("g")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", "var(--outline-variant, #c7c4d8)")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", (d: any) => d.strength * 1.5);

    const edgeLabels = container
      .append("g")
      .selectAll("text")
      .data(links)
      .enter()
      .append("text")
      .text((d: any) => d.relationship)
      .attr("font-size", "10px")
      .attr("font-family", "Inter, sans-serif")
      .attr("fill", "var(--on-surface-variant, #464555)")
      .attr("opacity", 0.8)
      .attr("text-anchor", "middle")
      .style("pointer-events", "none");

    const node = container
      .append("g")
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "cursor-pointer")
      .on("click", (event, d: any) => setSelectedNode(d))
      .call(
        d3
          .drag<SVGGElement, any>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }),
      );

    node
      .append("circle")
      .attr("r", (d: any) => 24 + d.importance * 3)
      .attr("fill", "var(--surface-container-lowest, #ffffff)")
      .attr("stroke", (d: any) => color(d.cluster))
      .attr("stroke-width", 3)
      .attr("class", "transition-all duration-300 hover:stroke-[5px]");

    node
      .append("text")
      .text((d: any) => d.label)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .attr("font-size", "11px")
      .attr("font-family", "Inter, sans-serif")
      .attr("font-weight", "600")
      .attr("fill", "var(--on-surface, #141b2b)")
      .style("pointer-events", "none")
      .each(function (d: any) {
        // Simple text wrapping logic
        const el = d3.select(this);
        const words = d.label.split(/\\s+/);
        el.text("");
        if (words.length > 2) {
          el.append("tspan").text(words.slice(0, 2).join(" ")).attr("x", 0).attr("y", -6);
          el.append("tspan").text(words.slice(2).join(" ")).attr("x", 0).attr("y", 8);
        } else {
          el.text(d.label);
        }
      });

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      edgeLabels
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });
  }, [result]);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full -mt-8 relative overflow-hidden">
      {/* Tool Header & Input Section */}
      <section className="bg-surface-container-lowest p-6 border-b border-outline-variant z-10 shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-headline-md text-headline-md text-on-surface">ConceptLinker</h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Map connections between complex academic topics using AI.</p>
            </div>
            <button
              onClick={generateMap}
              disabled={loading || topics.length < 2}
              className="bg-primary text-on-primary px-6 py-2.5 rounded-lg font-label-md text-label-md flex items-center gap-2 hover:shadow-lg transition-shadow disabled:opacity-50 disabled:hover:shadow-none"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin" style={{ fontVariationSettings: "'opsz' 20" }}>sync</span>
              ) : (
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'opsz' 20" }}>auto_awesome</span>
              )}
              {loading ? "Generating..." : "Generate Map"}
            </button>
          </div>
          
          <form
            onSubmit={addTopic}
            className="bg-surface p-1 rounded-xl border border-outline-variant flex items-center flex-wrap gap-2 focus-within:border-primary transition-colors"
          >
            <div className="flex items-center flex-wrap gap-2 p-2">
              <AnimatePresence>
                {topics.map((t, i) => (
                  <motion.span
                    key={t}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className={cn(
                      "px-3 py-1 rounded-full text-label-sm font-label-sm flex items-center gap-1",
                      i % 3 === 0 ? "bg-primary-container text-on-primary-container" : i % 3 === 1 ? "bg-secondary-container text-on-secondary-container" : "bg-tertiary-container text-on-tertiary-container"
                    )}
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => removeTopic(t)}
                      className="material-symbols-outlined text-[14px] hover:text-error transition-colors"
                    >
                      close
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
            <input
              type="text"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              className="flex-1 min-w-[200px] bg-transparent border-none focus:ring-0 font-body-sm text-body-sm px-4 outline-none"
              placeholder="Add a topic (e.g. Calculus)..."
              disabled={loading || topics.length >= 10}
            />
            <VoiceInput 
              onTranscript={(text) => setTopicInput(prev => prev ? prev + " " + text : text)}
            />
            <span className="px-4 font-label-sm text-label-sm text-on-surface-variant shrink-0">
              {topics.length}/10 topics
            </span>
          </form>
          {error && <p className="text-error text-label-sm">{error}</p>}
        </div>
      </section>

      {/* Graph Area & Info Sidebar Layout */}
      <div className="flex-1 flex overflow-hidden relative bg-[radial-gradient(var(--outline-variant)_1px,transparent_1px)] [background-size:32px_32px]">
        {/* Graph Simulation Area */}
        <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center">
          {!result && !loading && (
             <div className="text-center p-8 w-full max-w-md mx-auto bg-surface-container-lowest/80 backdrop-blur-sm rounded-2xl border border-outline-variant shadow-sm">
                <span className="material-symbols-outlined text-5xl text-primary mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>account_tree</span>
                <h2 className="w-full font-headline-sm text-headline-sm text-on-surface mb-2">Build Your Knowledge Map</h2>
                <p className="w-full font-body-sm text-body-sm text-on-surface-variant">Add at least 2 topics above to generate a neural visualization of how they connect.</p>
             </div>
          )}
          
          {loading && (
             <div className="bg-surface-container-lowest/80 backdrop-blur-sm p-8 rounded-2xl border border-outline-variant shadow-sm">
                <LoadingSpinner message="Calculating centrality vectors and establishing conceptual bridges..." />
             </div>
          )}

          {result && (
            <>
              <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
              
              {/* Graph Legend Overlay */}
              <div className="absolute bottom-6 left-6 bg-surface/80 backdrop-blur-md p-4 rounded-xl border border-outline-variant shadow-sm flex flex-col gap-2 pointer-events-none">
                <p className="font-label-sm text-label-sm font-bold text-on-surface-variant mb-1">Node Colors = Clusters</p>
                <p className="font-label-sm text-label-sm font-bold text-on-surface-variant">Node Size = Importance</p>
                <p className="font-label-sm text-[10px] text-on-surface-variant italic mt-1">Scroll to zoom, drag to pan</p>
              </div>
            </>
          )}
        </div>

        {/* Info Sidebar */}
        <AnimatePresence>
          {result && (
            <motion.aside
              initial={{ x: 320 }}
              animate={{ x: 0 }}
              exit={{ x: 320 }}
              className="w-80 bg-surface-container-lowest border-l border-outline-variant flex flex-col overflow-y-auto shrink-0 shadow-[-4px_0_15px_rgba(0,0,0,0.05)] z-20"
            >
              {selectedNode ? (
                <div className="p-6 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-headline-sm text-headline-sm text-on-surface">Node Details</h2>
                    <button
                      onClick={() => setSelectedNode(null)}
                      className="material-symbols-outlined text-on-surface-variant hover:text-on-surface transition-colors"
                    >
                      close
                    </button>
                  </div>
                  
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-on-primary-container">psychology</span>
                      </div>
                      <h3 className="font-label-md text-label-md text-primary">{selectedNode.label}</h3>
                    </div>
                    <span className="inline-block px-2 py-1 bg-surface-container rounded-md font-label-sm text-[10px] text-on-surface-variant mb-3">
                      Cluster: {selectedNode.cluster}
                    </span>
                    <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                      {selectedNode.summary}
                    </p>
                  </div>

                  <div className="mb-6">
                    <h4 className="font-label-sm text-label-sm text-on-surface uppercase tracking-wider mb-3">Key Connections</h4>
                    <div className="flex flex-col gap-3">
                      {result.edges
                        .filter((e) => {
                           // d3 converts source/target to objects after simulation runs
                           const srcId = typeof e.source === 'object' ? (e.source as any).id : e.source;
                           const tgtId = typeof e.target === 'object' ? (e.target as any).id : e.target;
                           return srcId === selectedNode.id || tgtId === selectedNode.id;
                        })
                        .map((edge, i) => {
                          const srcId = typeof edge.source === 'object' ? (edge.source as any).id : edge.source;
                          const tgtId = typeof edge.target === 'object' ? (edge.target as any).id : edge.target;
                          const isSource = srcId === selectedNode.id;
                          const otherNodeId = isSource ? tgtId : srcId;
                          const otherNode = result.nodes.find((n) => n.id === otherNodeId);
                          
                          if (!otherNode) return null;

                          return (
                            <div
                              key={i}
                              onClick={() => setSelectedNode(otherNode)}
                              className="p-3 bg-surface rounded-lg border border-outline-variant hover:border-primary transition-colors cursor-pointer"
                            >
                              <p className="font-label-md text-label-md text-on-surface">{otherNode.label}</p>
                              <p className="font-body-sm text-body-sm text-primary">
                                {isSource ? "→" : "←"} {edge.relationship}
                              </p>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-headline-sm text-headline-sm text-on-surface">Map Overview</h2>
                  </div>
                  
                  <div className="bg-tertiary-container/10 p-4 rounded-xl border border-tertiary-container/20 mb-8">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
                      <span className="font-label-md text-label-md text-tertiary">Key Insight</span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-tertiary-fixed-variant leading-relaxed">
                      {result.insight}
                    </p>
                  </div>

                  <div>
                     <h4 className="font-label-sm text-label-sm text-on-surface uppercase tracking-wider mb-3">Clusters Detected</h4>
                     <div className="flex flex-col gap-2">
                       {[...new Set(result.nodes.map((n) => n.cluster))].map((c) => (
                         <div key={c} className="flex justify-between items-center bg-surface p-2 rounded-lg border border-outline-variant">
                           <span className="font-label-sm text-label-sm text-on-surface">{c}</span>
                           <span className="bg-primary-container/50 text-on-primary-container px-2 py-0.5 rounded text-xs font-bold">
                             {result.nodes.filter(n => n.cluster === c).length}
                           </span>
                         </div>
                       ))}
                     </div>
                  </div>
                  
                  <div className="mt-auto pt-6 flex flex-col gap-4 text-center">
                    <ShareCard 
                      title="Concept Map"
                      topic={topics.join(", ")}
                      content={[result.insight, ...result.nodes.slice(0, 3).map(n => n.label)]}
                      accentColor="#f59e0b"
                      toolLabel="Mapper"
                    />
                    <p className="font-label-sm text-label-sm text-on-surface-variant italic">
                      Click any node to see its detailed connections.
                    </p>
                  </div>
                </div>
              )}
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Suggested Study Order Footer */}
      <AnimatePresence>
        {result && (
          <motion.footer
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="bg-surface-container-low p-4 px-margin-desktop border-t border-outline-variant z-10 shrink-0"
          >
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center gap-4 overflow-x-auto pb-2 custom-scrollbar">
                <div className="flex-shrink-0 flex items-center gap-3">
                  <span className="font-label-sm text-label-sm text-on-surface-variant whitespace-nowrap">SUGGESTED PATH:</span>
                  <span className="material-symbols-outlined text-on-surface-variant text-[18px]">trending_flat</span>
                </div>
                
                {result.studyOrder.map((step, index) => (
                  <div key={index} className="flex items-center gap-2 shrink-0">
                    <div className={cn(
                      "border px-4 py-2 rounded-lg flex items-center gap-3 whitespace-nowrap shadow-sm transition-colors cursor-pointer hover:bg-surface-container-highest",
                      selectedNode?.label === step 
                        ? "bg-primary text-on-primary border-primary" 
                        : "bg-surface-container-lowest border-outline-variant text-on-surface"
                    )}
                    onClick={() => {
                       const node = result.nodes.find(n => n.label === step);
                       if (node) setSelectedNode(node);
                    }}>
                      <span className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px]",
                        selectedNode?.label === step ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                      )}>
                        {index + 1}
                      </span>
                      <span className="font-label-md text-label-md">{step}</span>
                    </div>
                    {index < result.studyOrder.length - 1 && (
                      <span className="material-symbols-outlined text-outline-variant text-[18px]">chevron_right</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.footer>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--outline-variant);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
