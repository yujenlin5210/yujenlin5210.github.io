import { motion } from 'framer-motion';

const sections = [
  {
    id: 'day1',
    title: '[Day 1] - Tweenie',
    content: () => (
      <>
        <h3>What is Tweenie?</h3>
        <p>Tweenie is a Unity package that enables tween animations. The main purpose of developing this package was to practice my API development skills. This blog documents the design decisions that I have made and I am open to receiving feedback and suggestions for better code library and API design practices.</p>

        <h3>How does Tweenie work?</h3>
        <ul>
          <li><code>Tweenie</code> creates a Singleton gameobject in the scene to handle the animation of a value</li>
          <li>The value type can be anything that can be linearly interpolated between two other values</li>
          <li>Linear interpolation (lerp) is used to calculate intermediate values between the start and end values</li>
          <li><code>Tweenie</code> maintains a Set of <code>Tweeners</code>, which are animated every frame until the animation is completed</li>
          <li>Once the animation is completed, the <code>Tweener</code> is removed from the Set</li>
        </ul>

        <h3>Current API</h3>
        <div className="my-6 p-4 bg-slate-900 rounded-xl font-mono text-xs md:text-sm shadow-inner border border-white/10 overflow-x-auto">
          <pre className="text-indigo-300"><code>{`public static ITweener To<T>(Func<T, T> param, T fromValue, T toValue, float duration, Func<T,T,float,T> lerpFunc)`}</code></pre>
        </div>
        <p>For basic types like <code>float</code>, <code>Vector3</code>, and <code>Color</code>, <code>Tweenie</code> provides overloaded versions:</p>
        <div className="my-6 p-4 bg-slate-900 rounded-xl font-mono text-xs md:text-sm shadow-inner border border-white/10 overflow-x-auto">
          <pre className="text-indigo-300"><code>{`Tweenie.To(x => myValue = x, oldValue, newValue, duration);`}</code></pre>
        </div>

        <h3>Singleton? That sounds evil!</h3>
        <p>The Singleton pattern was used for <code>Tweenie</code> to ensure that only one instance of the game object exists in the scene to hook into the game loop. However, alternative design patterns may be explored in the future to improve testability.</p>
        
        <h3>OnComplete</h3>
        <p><code>Tweenie</code> has a function to register a callback <code>OnComplete</code> that is triggered when the animation is finished, using a fluent interface/method chaining:</p>
        <div className="my-6 p-4 bg-slate-900 rounded-xl font-mono text-xs md:text-sm shadow-inner border border-white/10 overflow-x-auto">
          <pre className="text-indigo-300"><code>{`Tweenie.To(x => myValue = x, oldValue, newValue, duration).OnComplete(OnTweenComplete);`}</code></pre>
        </div>
      </>
    )
  },
  {
    id: 'day2',
    title: '[Day 2] - Easing',
    content: () => (
      <>
        <h3>Bug-Fix: Param does not need return type</h3>
        <p>The first argument of the <code>To</code> method was unnecessarily returning a value type <code>T</code>. I’ve updated the function signature to use an <code>Action&lt;T&gt;</code> instead.</p>

        <h3>Bug-Fix: Avoid modifying set while iterating</h3>
        <p>I fixed a bug related to iterating through a <code>HashSet</code> while modifying it by adding a new <code>HashSet</code> to hold all the new <code>Tweeners</code> created during the <code>Update</code> loop.</p>

        <h3>New: SetEase Method</h3>
        <p>The new feature <code>SetEase</code> allows users to apply an animation curve, using built-in ones like <code>Linear</code> or passing a custom curve.</p>
        <div className="my-6 p-4 bg-slate-900 rounded-xl font-mono text-xs md:text-sm shadow-inner border border-white/10 overflow-x-auto">
          <pre className="text-indigo-300"><code>{`ITweener SetEase(AnimationCurve curve)
ITweener SetEase(Ease easeType)`}</code></pre>
        </div>
      </>
    )
  },
  {
    id: 'day3',
    title: '[Day 3] - Loop',
    content: () => (
      <>
        <div className="not-prose mb-8">
          <div className="w-full rounded-2xl overflow-hidden shadow-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10">
            <img src="/assets/images/lab/tweenie/loop_demo.gif" alt="Loop Demo" className="w-full h-auto object-cover block m-0" style={{ margin: 0, padding: 0 }} />
          </div>
        </div>

        <h3>New Tweener Control Methods</h3>
        <ul>
          <li><code>Play()</code>: Resumes the Tweener animation.</li>
          <li><code>Pause()</code>: Pauses the Tweener animation at its current value.</li>
          <li><code>Stop()</code>: Stops the Tweener animation and resets to FromValue.</li>
          <li><code>StopAfterStepComplete()</code>: Stops the Tweener animation after the current step is complete.</li>
          <li><code>Complete()</code>: Stops the Tweener animation and sets to ToValue.</li>
        </ul>

        <h3>New Looping Capability</h3>
        <p>Now, <code>Tweenie</code> supports looping in both a fixed amount of times and an infinite manner, in Default or PingPong mode.</p>
        <div className="my-6 p-4 bg-slate-900 rounded-xl font-mono text-xs md:text-sm shadow-inner border border-white/10 overflow-x-auto">
          <pre className="text-indigo-300"><code>{`tweener.SetEase(easeCurve).SetLoop(Loop.Default);
tween.SetEase(Ease.EaseInOut).SetLoop(Loop.PingPong, 3);`}</code></pre>
        </div>
      </>
    )
  },
  {
    id: 'day4',
    title: '[Day 4] - Bug Fix',
    content: () => (
      <>
        <h3>Exception handling when tweener associated object is destroyed</h3>
        <p>If a tweener was still running but the tweener-associated object was destroyed, it resulted in a <code>MissingReferenceException</code>. We implemented exception handling using a Try/Catch block. In the event of an exception, the <code>Tweener</code> will now destroy itself.</p>

        <div className="my-6 p-4 bg-slate-900 rounded-xl font-mono text-xs md:text-sm shadow-inner border border-white/10 overflow-x-auto">
          <pre className="text-indigo-300"><code>{`bool TrySetParam(T value) {
    try {
        Param(value);
    } catch (MissingReferenceException e) {
        Destroy();
        return false;
    } catch (Exception e) {
        Destroy();
        return false;
    }
    return true;
}`}</code></pre>
        </div>

        <h3>Tweenie Status in Inspector</h3>
        <div className="not-prose mb-8">
          <div className="w-full rounded-2xl overflow-hidden shadow-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10">
            <img src="/assets/images/lab/tweenie/bug_fix_logic.png" alt="Inspector Status" className="w-full h-auto object-cover block m-0" style={{ margin: 0, padding: 0 }} />
          </div>
        </div>
      </>
    )
  },
  {
    id: 'day5',
    title: '[Day 5] - Code Refactor',
    content: () => (
      <>
        <h3>Refactor: Move All Loop Control to Tweenie</h3>
        <p>To ensure consistency, we have refactored the control logic by moving it from <code>Tweener</code> to the <code>Tweenie</code> class. When a <code>Tweener</code> step is completed, the <code>Tweenie</code> class checks if the <code>Tweener</code> needs to be stopped or paused.</p>

        <h3>API Documentation</h3>
        <p>I generated the initial version of our API documentation for Tweenie using DocFx and Github Workflow.</p>
      </>
    )
  },
  {
    id: 'day6',
    title: '[Day 6] - Bulk Manipulation',
    content: () => (
      <>
        <h3>Bulk Manipulation with Tags</h3>
        <p>You can assign tags to tweeners upon creation, enabling easy control of multiple tweeners sharing the same tag. No more manual references or repetitive tasks!</p>

        <div className="my-6 p-4 bg-slate-900 rounded-xl font-mono text-xs md:text-sm shadow-inner border border-white/10 overflow-x-auto">
          <div className="flex gap-2 mb-2 opacity-50">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="ml-2 text-[10px] uppercase tracking-widest">MultiTweenerExample.cs</span>
          </div>
          <pre className="text-indigo-300"><code>{`public class MultiTweenerExample : MonoBehaviour {
    private void OnEnable() {
        Tweenie.PlayTweenerTag(this);
    }

    void Start() {
        Tweenie.To(x => transform.position = x, startPos, endPos, 1.0f, this)
               .SetLoop(Loop.PingPong);
    }

    private void OnDisable() {
        Tweenie.PauseTweenerTag(this);
    }

    private void OnDestroy() {
        Tweenie.RemoveTag(this);
    }
}`}</code></pre>
        </div>
      </>
    )
  },
  {
    id: 'reflections',
    title: 'Reflections',
    content: () => (
      <>
        <p className="text-xl md:text-2xl font-light leading-relaxed text-slate-600 dark:text-slate-300">
          Tweenie started as a practice in API development and evolved into a functional tool. It taught me the importance of consistency in control logic and the value of a fluent, developer-friendly interface.
        </p>
        <p className="mt-4">
          Check out the full source code on <a href="https://github.com/yjlintw/TWEENIE" target="_blank" rel="noreferrer" className="text-indigo-500 hover:text-indigo-600 underline">GitHub</a>.
        </p>
      </>
    )
  }
];

function Section({ section, index }) {
  return (
    <motion.div 
      className={`${index === 0 ? 'min-h-[40vh] pt-10 pb-20' : 'min-h-[70vh] py-20'} flex flex-col justify-center max-w-4xl mx-auto`}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ amount: 0.3 }}
      transition={{ duration: 0.6 }}
    >
      {section.title && <h2 className="text-3xl md:text-5xl font-bold mb-8 text-slate-900 dark:text-white">{section.title}</h2>}
      <div className="prose prose-lg dark:prose-invert prose-indigo prose-p:leading-relaxed max-w-none">
        {section.content()}
      </div>
    </motion.div>
  );
}

export default function TweenieLabPresentation() {
  return (
    <div className="relative w-full px-4 md:px-0">
      <div className="relative z-10 pb-32">
        {sections.map((section, index) => (
          <Section 
            key={section.id} 
            section={section} 
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
